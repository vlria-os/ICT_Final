package com.example.demo.join;

import com.example.demo.join.dto.PatientUserRequest;
import com.example.demo.patient.Patient;
import com.example.demo.patient.PatientRepository;
import com.example.demo.auth.dto.StaffUserResponse;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.role.Role;
import com.example.demo.role.RoleRepository;
import com.example.demo.socialAccount.SocialAccount;
import com.example.demo.socialAccount.SocialAccountRepository;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserDto;
import com.example.demo.user.UserRepository;
import com.example.demo.userRole.UserRole;
import com.example.demo.userRole.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JoinService {
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SocialAccountRepository socialAccountRepository;
    private final DepartmentRepository departmentRepository;
    private final StaffRepository staffRepository;

    public String join(PatientUserRequest request){
        String rrn= request.getRrn();
        if (rrn == null || rrn.trim().isEmpty()){
            throw new RuntimeException("주민등록번호를 입력하세요.");
        }

        if (!rrn.matches("\\d+")){
            throw new RuntimeException("주민등록번호는 숫자로만 입력하세요.");
        }

        String email=request.getEmail();
        if (email == null || email.trim().isEmpty()){
            throw new RuntimeException("이메일을 입력하세요.");
        }

        String emailChecked=emailCheck(email);
        if ("failure".equals(emailChecked)){
            throw new RuntimeException("이미 사용 중인 이메일입니다.");
        }

        String password= request.getPassword();
        if (password == null || password.trim().isEmpty()){
            throw new RuntimeException("비밀번호를 입력하세요.");
        }

        String name= request.getName();
        if (name == null || name.trim().isEmpty()){
            throw new RuntimeException("이름을 입력하세요.");
        }

        Role role=roleRepository.findByRoleName("PATIENT");
        String encodedPwd=passwordEncoder.encode(password.trim());

        boolean exists=patientRepository.existsByRrn(rrn);
        if (exists){
            Patient patient=patientRepository.findByRrn(rrn);

            User user=userRepository.save(User.builder()
                    .email(email.trim())
                    .password(encodedPwd)
                    .status("Y").build());

            userRoleRepository.save(UserRole.builder()
                    .user(user)
                    .role(role).build());

            patient.setUser(user);
            return "REGISTERED_USER";
        } else {
            User user=userRepository.save(User.builder()
                    .email(email.trim())
                    .password(encodedPwd)
                    .status("Y").build());

            userRoleRepository.save(UserRole.builder()
                    .user(user)
                    .role(role).build());

            patientRepository.save(Patient.builder()
                    .user(user)
                    .rrn(rrn.trim())
                    .name(name.trim())
                    .phone(request.getPhone() != null ? request.getPhone():null)
                    .address(request.getAddress() != null ? request.getAddress() : null)
                    .gender(request.getGender() != null ? request.getGender() : null)
                    .bloodType(request.getBloodType() != null ? request.getBloodType() : null)
                    .height(request.getHeight() != null ? request.getHeight() : null)
                    .weight(request.getWeight() != null ? request.getWeight() : null).build());

            return "NEW_USER";
        }
    }

    public String emailCheck(String email){
        if (email == null || email.trim().isEmpty()){
            throw new RuntimeException("이메일을 입력하세요.");
        }

        boolean exists=userRepository.existsByEmail(email);
        return exists ? "failure":"success";
    }

    public String rrnCheck(String rrn){
        if (rrn == null || rrn.trim().isEmpty()){
            throw new RuntimeException("주민등록번호를 입력하세요.");
        }

        if (!rrn.matches("\\d+")){
            throw new RuntimeException("주민등록번호는 숫자로만 입력하세요.");
        }

        boolean exists=patientRepository.existsByRrn(rrn);
        if (exists){
            Patient patient=patientRepository.findByRrn(rrn);
            if (patient.getUser() == null){
                return "UNREGISTERED_USER";
            } else {
                List<SocialAccount> accounts=socialAccountRepository.findByUser(patient.getUser());
                if(accounts != null && !accounts.isEmpty() && accounts.size() > 0){
                    return "SOCIAL_USER";
                } else {
                    return "REGISTERED_USER";
                }
            }
        }

        return "NEW_USER";
    }
    public UserDto joinTest(StaffUserResponse response){
        User user=User.builder()
                .email(response.getEmail())
                .password(response.getPassword())
                .status(response.getStatus())
                .build();
        User save=userRepository.save(user);

        List<UserRole> roles=new ArrayList<>();
        for (Integer id : response.getRoles()){
            Role role=roleRepository.findByRoleId(id);
            UserRole userRole=UserRole.builder().user(user).role(role).build();
            UserRole saveRole=userRoleRepository.save(userRole);
            roles.add(saveRole);
        }

        Department department=departmentRepository.findByDepartmentId(response.getDepartmentId());

        Staff staff= Staff.builder()
                .user(user)
                .department(department)
                .name(response.getName())
                .phone(response.getPhone())
                .address(response.getAddress())
                .build();

        staffRepository.save(staff);

        return new UserDto(save);
    }
}
