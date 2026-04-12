package com.devpulse.auth.repository;

import com.orbit.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * JPA-репозиторий для сущности {@link User}.
 *
 * <p>Spring Data JPA автоматически реализует методы на основе их имён
 * (query derivation) — написание SQL или JPQL не требуется.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Ищет пользователя по имени.
     * Используется в {@link com.orbit.auth.service.UserDetailsServiceImpl}
     * и {@link com.orbit.auth.service.AuthService}.
     *
     * @param username имя пользователя
     * @return {@link Optional} с пользователем или пустой, если не найден
     */
    Optional<User> findByUsername(String username);

    /**
     * Проверяет, занято ли имя пользователя.
     * Используется при валидации регистрации перед сохранением в базу.
     *
     * @param username имя для проверки
     * @return {@code true} если пользователь с таким именем уже существует
     */
    boolean existsByUsername(String username);

    /**
     * Проверяет, зарегистрирован ли уже данный email.
     * Используется при валидации регистрации перед сохранением в базу.
     *
     * @param email адрес для проверки
     * @return {@code true} если аккаунт с таким email уже существует
     */
    boolean existsByEmail(String email);
}
