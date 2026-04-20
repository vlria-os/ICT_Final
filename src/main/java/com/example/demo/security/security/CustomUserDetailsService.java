package com.example.demo.security.security;

import com.example.demo.patient.Patient;
import com.example.demo.patient.PatientRepository;
import com.example.demo.socialAccount.SocialAccount;
import com.example.demo.socialAccount.SocialAccountException;
import com.example.demo.socialAccount.SocialAccountRepository;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final SocialAccountRepository socialAccountRepository;
    private final PatientRepository patientRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user=userRepository.getWithRoles(username)
                .orElseThrow(()->new UsernameNotFoundException("사용자를 찾을 수 없습니다."));
        Staff staff=staffRepository.findByUser(user).orElse(null);

        Integer departmentId=null;
        String name=null;
        if (staff != null && staff.getDepartment() != null){
            departmentId=staff.getDepartment().getDepartmentId();
            name=staff.getName();
        } else {
            Patient patient=patientRepository.findByUser(user);
            name=patient.getName();
        }

        List<SocialAccount> accounts=socialAccountRepository.findByUser(user);
        if (accounts != null && accounts.size() > 0){
            List<String> providers=accounts.stream().map(a -> a.getProvider().name()).toList();
            throw new SocialAccountException(providers);
        }

        return new CustomUserDetails(user, departmentId, name);
    }
}
