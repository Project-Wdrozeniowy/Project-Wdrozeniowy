package com.devpulse.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Completes the generated OpenAPI document with what springdoc cannot derive
 * from the controllers and DTOs, so that it describes the actual responses:
 *
 * <ul>
 *   <li><b>Error bodies.</b> Every 4xx/5xx response carries the RFC 9457
 *       {@code ProblemDetail} ({@code application/problem+json}) written by
 *       {@link com.devpulse.exception.GlobalExceptionHandler} and the security
 *       entry points in {@link SecurityConfig}. springdoc would describe it with
 *       the operation's success type instead.</li>
 *   <li><b>Required properties.</b> Jackson writes every property of a response
 *       DTO, {@code null} included, so all properties of a schema used only in
 *       success responses are required. A schema also used in a request is left
 *       alone: there a missing property means "not sent".</li>
 *   <li><b>Nullable properties.</b> A DTO field annotated
 *       {@code @Schema(nullable = true)} accepts {@code null} in the OpenAPI 3.1
 *       form: {@code "null"} is added to its types, or a reference becomes
 *       {@code anyOf} the reference and {@code {"type": "null"}}. springdoc drops
 *       {@code nullable} from 3.1 documents.</li>
 *   <li><b>Tag order.</b> The tags keep the display order of
 *       {@link OpenApiConfig#tags()} instead of controller discovery order.</li>
 * </ul>
 *
 * <p>Every step is idempotent: customising an already customised document
 * changes nothing.
 */
@Component
public class OpenApiContractCustomizer implements OpenApiCustomizer {

    static final String PROBLEM_DETAIL = "ProblemDetail";

    private static final String SCHEMA_REF_PREFIX = "#/components/schemas/";

    @Override
    public void customise(OpenAPI openApi) {
        describeErrorsAsProblemDetails(openApi);
        requirePropertiesOfResponseSchemas(openApi);
        allowNullInNullableProperties(openApi);
        orderTags(openApi);
    }

    private static void describeErrorsAsProblemDetails(OpenAPI openApi) {
        openApi.getComponents().addSchemas(PROBLEM_DETAIL, problemDetailSchema());
        operations(openApi).forEach(operation -> operation.getResponses().forEach((code, response) -> {
            if (isError(code)) {
                response.setContent(new Content().addMediaType(
                        org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                        new MediaType().schema(new Schema<>().$ref(SCHEMA_REF_PREFIX + PROBLEM_DETAIL))));
            }
        }));
    }

    private static void requirePropertiesOfResponseSchemas(OpenAPI openApi) {
        Map<String, Schema> schemas = openApi.getComponents().getSchemas();
        Set<String> responseOnly = reachable(schemas, operations(openApi)
                .flatMap(operation -> operation.getResponses().entrySet().stream())
                .filter(response -> !isError(response.getKey()))
                .flatMap(response -> schemasOf(response.getValue().getContent())));
        responseOnly.removeAll(reachable(schemas, operations(openApi).flatMap(OpenApiContractCustomizer::requestSchemas)));

        for (String name : responseOnly) {
            Schema<?> schema = schemas.get(name);
            if (schema != null && schema.getProperties() != null) {
                schema.setRequired(new ArrayList<>(schema.getProperties().keySet()));
            }
        }
    }

    private static void allowNullInNullableProperties(OpenAPI openApi) {
        for (Schema<?> schema : openApi.getComponents().getSchemas().values()) {
            if (schema.getProperties() != null) {
                schema.getProperties().replaceAll((name, property) ->
                        Boolean.TRUE.equals(property.getNullable()) ? withNull(property) : property);
            }
        }
    }

    private static void orderTags(OpenAPI openApi) {
        if (openApi.getTags() == null) {
            return;
        }
        List<String> order = OpenApiConfig.tags().stream().map(Tag::getName).toList();
        List<Tag> tags = new ArrayList<>(openApi.getTags());
        tags.sort(Comparator.comparingInt((Tag tag) -> order.contains(tag.getName()) ? order.indexOf(tag.getName()) : order.size())
                .thenComparing(Tag::getName));
        openApi.setTags(tags);
    }

    private static Schema<?> withNull(Schema<?> property) {
        if (property.get$ref() != null) {
            return new Schema<>()
                    .anyOf(List.of(new Schema<>().$ref(property.get$ref()), typed("null")))
                    .description(property.getDescription());
        }
        Set<String> types = new LinkedHashSet<>();
        if (property.getTypes() != null) {
            types.addAll(property.getTypes());
        } else if (property.getType() != null) {
            types.add(property.getType());
        }
        types.add("null");
        property.setTypes(types);
        property.setNullable(null);
        return property;
    }

    private static Schema<?> problemDetailSchema() {
        Schema<?> schema = typed("object")
                .description("RFC 9457 problem details returned with every 4xx and 5xx response");
        schema.addProperty("type", typed("string").format("uri")
                .description("Problem type URI; omitted for the default about:blank"));
        schema.addProperty("title", typed("string")
                .description("Short summary of the problem type").example("Not Found"));
        schema.addProperty("status", typed("integer").format("int32")
                .description("HTTP status code").example(404));
        schema.addProperty("detail", typed("string")
                .description("Explanation of this occurrence").example("Post not found"));
        schema.addProperty("instance", typed("string").format("uri-reference")
                .description("Path of the failed request").example("/api/forum/posts/missing"));
        schema.addProperty("errors", typed("object").additionalProperties(typed("string"))
                .description("Validation messages by field name; present only when request validation fails"));
        schema.setRequired(List.of("title", "status", "detail", "instance"));
        return schema;
    }

    /** A schema of one JSON type, written the OpenAPI 3.1 way. */
    private static Schema<?> typed(String type) {
        return new Schema<>().types(Set.of(type));
    }

    /** Names of the component schemas the given schemas refer to, directly or through nested schemas. */
    private static Set<String> reachable(Map<String, Schema> schemas, Stream<Schema> roots) {
        Set<String> names = new LinkedHashSet<>();
        Deque<Schema> pending = new ArrayDeque<>(roots.toList());
        while (!pending.isEmpty()) {
            Schema<?> schema = pending.pop();
            if (schema.get$ref() != null) {
                String name = schema.get$ref().substring(SCHEMA_REF_PREFIX.length());
                if (names.add(name) && schemas.containsKey(name)) {
                    pending.push(schemas.get(name));
                }
            } else {
                nestedSchemas(schema).forEach(pending::push);
            }
        }
        return names;
    }

    private static Stream<Schema> nestedSchemas(Schema<?> schema) {
        Stream.Builder<Schema> nested = Stream.builder();
        if (schema.getProperties() != null) {
            schema.getProperties().values().forEach(nested::add);
        }
        if (schema.getItems() != null) {
            nested.add(schema.getItems());
        }
        if (schema.getAdditionalProperties() instanceof Schema<?> additional) {
            nested.add(additional);
        }
        Stream.of(schema.getAllOf(), schema.getAnyOf(), schema.getOneOf())
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .forEach(nested::add);
        return nested.build();
    }

    private static Stream<Schema> requestSchemas(Operation operation) {
        Stream<Schema> body = operation.getRequestBody() == null
                ? Stream.empty()
                : schemasOf(operation.getRequestBody().getContent());
        Stream<Schema> parameters = operation.getParameters() == null
                ? Stream.empty()
                : operation.getParameters().stream().map(Parameter::getSchema).filter(Objects::nonNull);
        return Stream.concat(body, parameters);
    }

    private static Stream<Schema> schemasOf(Content content) {
        return content == null
                ? Stream.empty()
                : content.values().stream().map(MediaType::getSchema).filter(Objects::nonNull);
    }

    private static Stream<Operation> operations(OpenAPI openApi) {
        return openApi.getPaths() == null
                ? Stream.empty()
                : openApi.getPaths().values().stream().flatMap(path -> path.readOperations().stream());
    }

    /** {@code default} and every 4xx/5xx code, including ranges such as {@code 4XX}. */
    private static boolean isError(String code) {
        return "default".equals(code) || code.charAt(0) >= '4';
    }
}
