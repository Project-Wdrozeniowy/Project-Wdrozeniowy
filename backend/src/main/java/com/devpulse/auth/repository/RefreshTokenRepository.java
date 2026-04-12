package com.devpulse.auth.repository;

import com.orbit.auth.entity.RefreshToken;
import com.orbit.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/**
 * JPA-репозиторий для сущности {@link RefreshToken}.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * Ищет refresh token по его значению.
     * Используется при обновлении access token и проверке срока действия.
     *
     * @param token значение refresh token, переданное клиентом
     * @return {@link Optional} с токеном или пустой, если не существует в базе
     */
    Optional<RefreshToken> findByToken(String token);

    /**
     * Удаляет все refresh токены, принадлежащие указанному пользователю.
     *
     * <p>Вызывается при каждом входе, чтобы избежать накопления токенов
     * в базе и обеспечить использование только последнего.
     * Аннотация {@link Modifying} обязательна для запросов, изменяющих данные.
     *
     * @param user пользователь, чьи токены нужно удалить
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user = :user")
    void deleteAllByUser(User user);
}
