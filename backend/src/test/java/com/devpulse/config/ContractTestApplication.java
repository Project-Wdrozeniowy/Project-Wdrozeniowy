package com.devpulse.config;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.mockito.Mockito;

/** Contract generation does not require persistence. Behaviour is verified in separate service/API suites. */
@org.springframework.context.annotation.Configuration
@org.springframework.context.annotation.Profile("contract")
@EnableAutoConfiguration(excludeName = {
        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
        "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration",
        "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration"})
@Import({OpenApiConfig.class, OpenApiContractCustomizer.class})
@org.springframework.context.annotation.ComponentScan(
        basePackages = "com.devpulse", useDefaultFilters = false,
        includeFilters = @org.springframework.context.annotation.ComponentScan.Filter(
                type = org.springframework.context.annotation.FilterType.ANNOTATION,
                classes = org.springframework.web.bind.annotation.RestController.class),
        excludeFilters = @org.springframework.context.annotation.ComponentScan.Filter(
                type = org.springframework.context.annotation.FilterType.REGEX,
                pattern = ".*(?:Test|Tests)\\$.*"))
class ContractTestApplication {
    @Bean
    static BeanFactoryPostProcessor controllerCollaborators() {
        return factory -> {
            // Keep discovering the production controller inventory; do not hide future routes behind a manual list.
            java.util.Arrays.stream(factory.getBeanDefinitionNames())
                    .map(factory::getBeanDefinition)
                    .map(org.springframework.beans.factory.config.BeanDefinition::getBeanClassName)
                    .filter(java.util.Objects::nonNull)
                    .map(name -> org.springframework.util.ClassUtils.resolveClassName(name, ContractTestApplication.class.getClassLoader()))
                    .filter(type -> type.isAnnotationPresent(org.springframework.web.bind.annotation.RestController.class))
                    .flatMap(type -> java.util.Arrays.stream(type.getDeclaredConstructors()))
                    .flatMap(constructor -> java.util.Arrays.stream(constructor.getParameterTypes()))
                    .distinct().forEach(type -> factory.registerSingleton(type.getName(), Mockito.mock(type)));
        };
    }
}
