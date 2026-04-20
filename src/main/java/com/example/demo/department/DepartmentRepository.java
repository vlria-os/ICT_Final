package com.example.demo.department;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    Department findByDepartmentId(Integer departmentId);
    Optional<Department> findByDepartmentName(String name);
    List<Department> findByStatus(String status);
    List<Department> findByDepartmentCategory(String departmentCategory);
    List<Department> findByDepartmentCategoryAndStatus(String departmentCategory, String status);
    boolean existsByDepartmentName(String departmentName);
}
