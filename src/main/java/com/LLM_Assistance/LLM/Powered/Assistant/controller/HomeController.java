package com.LLM_Assistance.LLM.Powered.Assistant.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.RestController;

@Controller
public class HomeController {

    // setting the home page on starting the apache tomcat at home url
    @GetMapping("/")
    public String home() {
        return "index";
    }

}