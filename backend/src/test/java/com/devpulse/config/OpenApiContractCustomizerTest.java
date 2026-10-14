package com.devpulse.config;

import io.swagger.v3.core.util.Json31;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.parameters.RequestBody;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.tags.Tag;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Each step of {@link OpenApiContractCustomizer} on a small hand-built
 * document. {@code OpenApiContractTest} checks the result on the real API.
 */
class OpenApiContractCustomizerTest {

    private final OpenApiContractCustomizer customizer = new OpenApiContractCustomizer();

    @Test
    void describesEveryErrorResponseAsProblemDetail() {
        OpenAPI openApi = document();

        customizer.customise(openApi);

        ApiResponses responses = openApi.getPaths().get("/things").getGet().getResponses();
        assertThat(responses.get("200").getContent()).containsOnlyKeys("application/json");
        assertThat(responses.get("404").getContent()).containsOnlyKeys("application/problem+json");
        assertThat(responses.get("404").getContent().get("application/problem+json").getSchema().get$ref())
                .isEqualTo("#/components/schemas/ProblemDetail");
        assertThat(openApi.getComponents().getSchemas().get("ProblemDetail").getRequired())
                .containsExactlyInAnyOrder("title", "status", "detail", "instance");
    }

    @Test
    void requiresEveryPropertyOfASchemaUsedOnlyInResponses() {
        OpenAPI openApi = document();

        customizer.customise(openApi);

        assertThat(schema(openApi, "Thing").getRequired()).containsExactlyInAnyOrder("name", "category");
        assertThat(schema(openApi, "Category").getRequired()).containsExactly("slug");
        assertThat(schema(openApi, "ThingRequest").getRequired()).isNull();
        assertThat(schema(openApi, "Shared").getRequired()).isNull();
    }

    @Test
    void turnsNullablePropertiesIntoOpenApi31NullTypes() {
        OpenAPI openApi = document();

        customizer.customise(openApi);

        Schema<?> name = property(openApi, "Thing", "name");
        assertThat(name.getTypes()).containsExactly("string", "null");
        assertThat(name.getNullable()).isNull();

        Schema<?> category = property(openApi, "Thing", "category");
        assertThat(category.get$ref()).isNull();
        assertThat(category.getDescription()).isEqualTo("Category, if any");
        assertThat(category.getAnyOf()).hasSize(2);
        assertThat(category.getAnyOf().get(0).get$ref()).isEqualTo("#/components/schemas/Category");
        assertThat(category.getAnyOf().get(1).getTypes()).containsExactly("null");
    }

    @Test
    void ordersTagsAsConfiguredAndAppendsOthersByName() {
        OpenAPI openApi = document();

        customizer.customise(openApi);

        assertThat(openApi.getTags()).extracting(Tag::getName).containsExactly("Auth", "Admin", "Alpha", "Zeta");
    }

    @Test
    void customisingTwiceChangesNothing() {
        OpenAPI openApi = document();
        customizer.customise(openApi);
        String once = Json31.pretty(openApi);

        customizer.customise(openApi);

        assertThat(Json31.pretty(openApi)).isEqualTo(once);
    }

    /**
     * One GET returning {@code Thing} (with a nested {@code Category}) or a 404,
     * one POST whose body is {@code ThingRequest} and which returns
     * {@code Shared}, a schema the request body also uses.
     */
    private static OpenAPI document() {
        Schema<?> thing = typed("object");
        thing.addProperty("name", typed("string").nullable(true));
        thing.addProperty("category", new Schema<>().$ref("#/components/schemas/Category")
                .description("Category, if any").nullable(true));

        Schema<?> category = typed("object");
        category.addProperty("slug", typed("string"));

        Schema<?> shared = typed("object");
        shared.addProperty("id", typed("integer"));

        Schema<?> thingRequest = typed("object");
        thingRequest.addProperty("name", typed("string"));
        thingRequest.addProperty("shared", ref("Shared"));

        Operation get = new Operation().responses(new ApiResponses()
                .addApiResponse("200", jsonResponse("Thing"))
                .addApiResponse("404", jsonResponse("Thing")));
        Operation post = new Operation()
                .requestBody(new RequestBody().content(json("ThingRequest")))
                .responses(new ApiResponses().addApiResponse("201", jsonResponse("Shared")));

        return new OpenAPI()
                .paths(new Paths()
                        .addPathItem("/things", new PathItem().get(get))
                        .addPathItem("/requests", new PathItem().post(post)))
                .components(new Components()
                        .addSchemas("Thing", thing)
                        .addSchemas("Category", category)
                        .addSchemas("Shared", shared)
                        .addSchemas("ThingRequest", thingRequest))
                .tags(new ArrayList<>(List.of(
                        new Tag().name("Zeta"),
                        new Tag().name("Admin"),
                        new Tag().name("Auth"),
                        new Tag().name("Alpha"))));
    }

    private static ApiResponse jsonResponse(String schemaName) {
        return new ApiResponse().description(schemaName).content(json(schemaName));
    }

    private static Content json(String schemaName) {
        return new Content().addMediaType("application/json", new MediaType().schema(ref(schemaName)));
    }

    private static Schema<?> ref(String schemaName) {
        return new Schema<>().$ref("#/components/schemas/" + schemaName);
    }

    private static Schema<?> typed(String type) {
        return new Schema<>().types(Set.of(type));
    }

    private static Schema<?> schema(OpenAPI openApi, String name) {
        return openApi.getComponents().getSchemas().get(name);
    }

    private static Schema<?> property(OpenAPI openApi, String schemaName, String propertyName) {
        return (Schema<?>) schema(openApi, schemaName).getProperties().get(propertyName);
    }
}
