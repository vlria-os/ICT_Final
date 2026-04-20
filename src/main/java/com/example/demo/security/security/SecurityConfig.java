package com.example.demo.security.security;

import com.example.demo.security.filter.JWTCheckFilter;
import com.example.demo.security.handler.ApiLoginFailureHandler;
import com.example.demo.security.handler.ApiLoginSuccessHandler;
import com.example.demo.security.handler.CustomAccessDeniedHandler;
import com.example.demo.security.jwtutil.JWTUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JWTUtil jwtUtil;
    private final ApiLoginSuccessHandler apiLoginSuccessHandler;
    private final ApiLoginFailureHandler apiLoginFailureHandler;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception{
        httpSecurity.sessionManagement(sessionConfig -> {
            sessionConfig.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED);
        });

        //csrf 토큰 사용하지 않기
        httpSecurity.csrf(csrf -> csrf.disable());

        httpSecurity.formLogin(form -> form
                .loginProcessingUrl("/login")
                .usernameParameter("email")
                .passwordParameter("password")
                .successHandler(apiLoginSuccessHandler)
                .failureHandler(apiLoginFailureHandler)
        );

        //CrossOrigin 설정
        httpSecurity.cors(cors -> cors.configurationSource(corsConfigurationSource()));

        httpSecurity.addFilterBefore(
                new JWTCheckFilter(jwtUtil),
                UsernamePasswordAuthenticationFilter.class
        );

        httpSecurity.exceptionHandling(ex ->
                ex.accessDeniedHandler(customAccessDeniedHandler));

        httpSecurity.authorizeHttpRequests(auth ->
                auth.requestMatchers("/login","/join", "/ws", "/ws/**", "/upload/**", "/jwt/token/refresh",
                                "/join/**", "/social/**", "/chatbot/inquiry/**").permitAll()
                        .anyRequest().authenticated()
        );

        return httpSecurity.build();
    }

    @Bean //CrossOrigin 설정: 웹브라우저에서(리액트-프론트엔드) 요청이 들어와도 요청 처리가 되도록 허용하기
    public CorsConfigurationSource corsConfigurationSource(){
        CorsConfiguration configuration=new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization","Cache-Control","Content-Type"));
        configuration.setAllowedMethods(Arrays.asList("GET","POST","PUT","DELETE","HEAD", "PATCH", "OPTIONS"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

//        // 2️⃣ SSE 전용 (/api/sse/**) → 특정 origin만 허용, 쿠키 사용
//        CorsConfiguration sseConfig = new CorsConfiguration();
//        sseConfig.setAllowedOriginPatterns(Arrays.asList("http://localhost:5173"));
//        sseConfig.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type"));
//        sseConfig.setAllowedMethods(Arrays.asList("GET"));
//        sseConfig.setAllowCredentials(true); // 쿠키 전송 허용
//        source.registerCorsConfiguration("/api/sse/**", sseConfig);

        return source;
    }
}
