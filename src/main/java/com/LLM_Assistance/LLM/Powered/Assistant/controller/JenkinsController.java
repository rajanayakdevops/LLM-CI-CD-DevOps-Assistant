package com.LLM_Assistance.LLM.Powered.Assistant.controller;

import com.LLM_Assistance.LLM.Powered.Assistant.model.Build;
import com.LLM_Assistance.LLM.Powered.Assistant.service.JenkinsService;
import com.LLM_Assistance.LLM.Powered.Assistant.service.LLMService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class JenkinsController {

    @Autowired
    private JenkinsService jenkinsService;

    @Autowired
    private LLMService llmService;

    // GET /api/jobs — return all Jenkins job names
    @GetMapping("/jobs")
    public ResponseEntity<?> getJobs() {
        try {
            List<String> jobs = jenkinsService.getJobs();
            return ResponseEntity.ok(jobs);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to fetch jobs: " + e.getMessage());
        }
    }

    // GET /api/logs?job=jobName — fetch latest build logs
    @GetMapping("/logs")
    public ResponseEntity<?> getLogs(@RequestParam String job) {
        try {
            Build build = jenkinsService.getLatestBuild(job);
            return ResponseEntity.ok(Map.of(
                    "jobName", build.getJobName(),
                    "buildNumber", build.getBuildNumber(),
                    "status", build.getStatus() != null ? build.getStatus() : "IN_PROGRESS",
                    "duration", build.getDuration() != null ? build.getDuration() : 0,
                    "logs", build.getLogs()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to fetch logs: " + e.getMessage());
        }
    }

    // POST /api/analyze — analyze logs with Gemini AI
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeLogs(@RequestBody Map<String, Object> body) {
        try {
            String logs = (String) body.get("logs");
            String jobName = (String) body.get("jobName");
            Integer buildNumber = (Integer) body.get("buildNumber");

            String analysis = llmService.analyzeBuildLogs(logs);

            // Save analysis to MySQL
            if (jobName != null && buildNumber != null) {
                jenkinsService.saveAnalysis(jobName, buildNumber, analysis);
            }

            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Analysis failed: " + e.getMessage());
        }
    }

    // GET /api/history?job=jobName — get last 5 builds from MySQL
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam String job) {
        try {
            List<Build> history = jenkinsService.getBuildHistory(job);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to fetch history: see the MySql driver Connection  " + e.getMessage());
        }
    }
}
