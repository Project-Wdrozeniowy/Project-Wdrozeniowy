package com.devpulse.config;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.mockito.exceptions.base.MockitoException;
import org.skyscreamer.jsonassert.JSONCompare;
import org.skyscreamer.jsonassert.JSONCompareMode;
import org.skyscreamer.jsonassert.JSONCompareResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Array;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The published OpenAPI document lists exactly the implemented operations,
 * and {@code backend/openapi.json} is an up-to-date copy of it for clients
 * that generate code from the contract.
 *
 * <p>A handler counts as a contract stub when it answers
 * {@code 501 Not Implemented} without using its arguments or collaborators:
 * the test calls each one on a controller built with Mockito mocks and empty
 * arguments. Stubs must be hidden with {@code @Hidden}; everything else must
 * be published.
 *
 * <p>After an intended API change, review the new document and regenerate the
 * committed copy from the {@code backend} directory:
 * <pre>./mvnw test -Dtest=OpenApiContractTest -Dopenapi.contract.update=true</pre>
 */
@SpringBootTest(properties = "springdoc.api-docs.enabled=true")
@ActiveProfiles("test")
class OpenApiContractTest {

    /** Committed copy of the document; Maven runs the tests in the backend module directory. */
    private static final Path COMMITTED_CONTRACT = Path.of("openapi.json");

    private static final String UPDATE_PROPERTY = "openapi.contract.update";

    private static final Set<String> HTTP_METHODS = Set.of("get", "put", "post", "delete", "options", "head", "patch", "trace");

    @Autowired
    private WebApplicationContext context;

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void publishesEveryImplementedOperationAndNoStub() throws Exception {
        Set<String> published = publishedOperations(generatedDocument());
        Set<String> problems = new TreeSet<>();

        handlerMapping.getHandlerMethods().forEach((mapping, handler) -> {
            if (!handler.getBeanType().getPackageName().startsWith("com.devpulse")) {
                return;
            }
            boolean stub = answersNotImplemented(handler);
            operationsOf(mapping).forEach(operation -> {
                if (stub && published.contains(operation)) {
                    problems.add(operation + " answers 501 but is published; annotate it with @Hidden");
                } else if (!stub && !published.contains(operation)) {
                    problems.add(operation + " is implemented but missing from the contract; remove its @Hidden");
                }
            });
        });

        assertThat(published).as("published operations").isNotEmpty();
        assertThat(problems).isEmpty();
    }

    @Test
    void committedContractMatchesTheGeneratedDocument() throws Exception {
        String generated = generatedDocument();
        if (Boolean.getBoolean(UPDATE_PROPERTY)) {
            Files.writeString(COMMITTED_CONTRACT, generated.replace("\r\n", "\n").strip() + "\n", StandardCharsets.UTF_8);
            return;
        }

        assertThat(COMMITTED_CONTRACT).as("committed OpenAPI document").exists();
        JSONCompareResult result = JSONCompare.compareJSON(
                Files.readString(COMMITTED_CONTRACT, StandardCharsets.UTF_8), generated, JSONCompareMode.STRICT);
        if (result.failed()) {
            fail("backend/openapi.json does not match the API. Review the change, then regenerate it from backend/ with%n"
                    + "  ./mvnw test -Dtest=OpenApiContractTest -D%s=true%n%s", UPDATE_PROPERTY, result.getMessage());
        }
    }

    private String generatedDocument() throws Exception {
        return mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private static Set<String> publishedOperations(String document) {
        Map<String, Map<String, Object>> paths = JsonPath.read(document, "$.paths");
        return paths.entrySet().stream()
                .flatMap(path -> path.getValue().keySet().stream()
                        .filter(HTTP_METHODS::contains)
                        .map(method -> method.toUpperCase() + " " + path.getKey()))
                .collect(Collectors.toSet());
    }

    private static Stream<String> operationsOf(RequestMappingInfo mapping) {
        return mapping.getMethodsCondition().getMethods().stream()
                .flatMap(method -> mapping.getPatternValues().stream().map(pattern -> method.name() + " " + pattern));
    }

    /** Whether the handler throws {@code 501} before using anything it is given. */
    private static boolean answersNotImplemented(HandlerMethod handler) {
        Method method = handler.getMethod();
        Object[] emptyArguments = Arrays.stream(method.getParameterTypes())
                .map(OpenApiContractTest::emptyValue)
                .toArray();
        try {
            method.invoke(controllerWithMockedCollaborators(handler.getBeanType()), emptyArguments);
            return false;
        } catch (InvocationTargetException e) {
            return e.getCause() instanceof ResponseStatusException responseStatus
                    && responseStatus.getStatusCode().value() == HttpStatus.NOT_IMPLEMENTED.value();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Cannot call " + method, e);
        }
    }

    private static Object controllerWithMockedCollaborators(Class<?> controllerType) throws ReflectiveOperationException {
        Constructor<?> constructor = Arrays.stream(controllerType.getDeclaredConstructors())
                .max(Comparator.comparingInt(Constructor::getParameterCount))
                .orElseThrow();
        constructor.setAccessible(true);
        Object[] collaborators = Arrays.stream(constructor.getParameterTypes())
                .map(OpenApiContractTest::collaborator)
                .toArray();
        return constructor.newInstance(collaborators);
    }

    /** A Mockito mock, or the empty value of a type Mockito cannot mock, such as a primitive or {@code String}. */
    private static Object collaborator(Class<?> type) {
        if (type.isPrimitive()) {
            return emptyValue(type);
        }
        try {
            return Mockito.mock(type);
        } catch (MockitoException e) {
            return null;
        }
    }

    /** The default value of a primitive type, otherwise {@code null}. */
    private static Object emptyValue(Class<?> type) {
        return type.isPrimitive() ? Array.get(Array.newInstance(type, 1), 0) : null;
    }
}
