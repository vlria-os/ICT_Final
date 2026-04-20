package com.example.demo.join;

import com.example.demo.auth.dto.StaffUserResponse;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.role.Role;
import com.example.demo.role.RoleRepository;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserDto;
import com.example.demo.user.UserRepository;
import com.example.demo.userRole.UserRole;
import com.example.demo.userRole.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;


@Service
@RequiredArgsConstructor
public class JoinService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final DepartmentRepository departmentRepository;
    private final StaffRepository staffRepository;

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
