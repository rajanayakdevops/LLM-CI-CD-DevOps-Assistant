package com.LLM_Assistance.LLM.Powered.Assistant.repository;

import com.LLM_Assistance.LLM.Powered.Assistant.model.Build;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BuildRepository extends JpaRepository<Build, Long> {

    List<Build> findTop5ByJobNameOrderByBuildNumberDesc(String jobName);

    Optional<Build> findByJobNameAndBuildNumber(String jobName, Integer buildNumber);
}
