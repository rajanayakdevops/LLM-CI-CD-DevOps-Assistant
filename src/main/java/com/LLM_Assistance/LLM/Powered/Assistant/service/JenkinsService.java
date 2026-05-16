package com.LLM_Assistance.LLM.Powered.Assistant.service;

import com.LLM_Assistance.LLM.Powered.Assistant.model.Build;
import com.LLM_Assistance.LLM.Powered.Assistant.repository.BuildRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class JenkinsService {

    @Value("${jenkins.base.url}")
    private String jenkinsUrl;

    @Value("${jenkins.user}")
    private String jenkinsUser;

    @Value("${jenkins.token}")
    private String jenkinsToken;

    @Autowired
    private BuildRepository buildRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String getAuthHeader() {
        String credentials = jenkinsUser + ":" + jenkinsToken;
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    // Get all Jenkins job names
    public List<String> getJobs() throws IOException {
        String url = jenkinsUrl + "/api/json?tree=jobs[name]";
        String response = doGet(url);
        JsonNode root = objectMapper.readTree(response);
        List<String> jobs = new ArrayList<>();
        root.path("jobs").forEach(job -> jobs.add(job.path("name").asText()));
        return jobs;
    }

    // Fetch latest build info + logs and save to MySQL
    public Build getLatestBuild(String jobName) throws IOException {
        // Get latest build number
        String jobUrl = jenkinsUrl + "/job/" + jobName + "/api/json";
        String jobJson = doGet(jobUrl);
        JsonNode jobNode = objectMapper.readTree(jobJson);
        int buildNumber = jobNode.path("lastBuild").path("number").asInt();

        // Get build details
        String buildUrl = jenkinsUrl + "/job/" + jobName + "/" + buildNumber + "/api/json";
        String buildJson = doGet(buildUrl);
        JsonNode buildNode = objectMapper.readTree(buildJson);
        String status = buildNode.path("result").asText();
        int duration = (int) (buildNode.path("duration").asLong() / 1000);

        // Get console logs
        String logsUrl = jenkinsUrl + "/job/" + jobName + "/" + buildNumber + "/consoleText";
        String logs = doGet(logsUrl);

        // Save or update in MySQL
        Build build = buildRepository.findByJobNameAndBuildNumber(jobName, buildNumber)
                .orElse(new Build());
        build.setJobName(jobName);
        build.setBuildNumber(buildNumber);
        build.setStatus(status);
        build.setDuration(duration);
        build.setLogs(logs);
        buildRepository.save(build);

        return build;
    }

    // Save analysis to existing build record
    public void saveAnalysis(String jobName, Integer buildNumber, String analysis) {
        buildRepository.findByJobNameAndBuildNumber(jobName, buildNumber).ifPresent(build -> {
            build.setAnalysis(analysis);
            buildRepository.save(build);
        });
    }

    // Get last 5 builds from MySQL
    public List<Build> getBuildHistory(String jobName) {
        return buildRepository.findTop5ByJobNameOrderByBuildNumberDesc(jobName);
    }

    private String doGet(String url) throws IOException {
        try (CloseableHttpClient client = HttpClientBuilder.create().build()) {
            HttpGet get = new HttpGet(url);
            get.setHeader("Authorization", getAuthHeader());
            HttpResponse response = client.execute(get);
            return EntityUtils.toString(response.getEntity());
        }
    }
}
