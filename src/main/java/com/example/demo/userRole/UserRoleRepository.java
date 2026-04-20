package com.example.demo.userRole;

import com.example.demo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRoleRepository extends JpaRepository<UserRole, Integer> {
    List<UserRole> findByUserIn(List<User> users);
    List<UserRole> findByUser(User user);
    void deleteByUser(User user);
    @Query("""
        select ur
        from UserRole ur
        where ur.user in :users
            and ur.role.roleId = (
                select max(ur2.role.roleId)
                from UserRole ur2
                where ur2.user = ur.user
            )
    """)
    List<UserRole> findTopRoleByUsers(@Param("users") List<User> users);
}
