package com.example.demo.socialAccount.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class SocialLoginResponse {
    private Integer userId;
    private String email;
    private String name;
    private String accessToken;
    private String refreshToken;
    private List<String> roles;
    private String status;
    private Integer departmentId;
}
