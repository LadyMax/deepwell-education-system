#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const configFile = path.join(
    repoRoot,
    "DeepwellEducation",
    "wwwroot",
    "frontend",
    "js",
    "phone-country-config.js"
);
const flagsCourseDir = path.join(repoRoot, "DeepwellEducation", "wwwroot", "frontend", "images", "flags-course");
const flagsGlobalDir = path.join(repoRoot, "DeepwellEducation", "wwwroot", "frontend", "images", "flags-global");

function fail(message) {
    console.error("[phone-flag-check] " + message);
    process.exit(1);
}

if (!fs.existsSync(configFile)) fail("Config file not found: " + configFile);
if (!fs.existsSync(flagsCourseDir)) fail("Flags directory not found: " + flagsCourseDir);
if (!fs.existsSync(flagsGlobalDir)) fail("Global flags directory not found: " + flagsGlobalDir);

const text = fs.readFileSync(configFile, "utf8");
const regex = /flag:\s*"([^"]+)"/g;
const files = [];
let match;
while ((match = regex.exec(text)) !== null) {
    files.push(match[1]);
}

const missing = [];
for (const name of files) {
    const full = path.join(flagsCourseDir, name);
    if (!fs.existsSync(full)) missing.push(full);
}

const internationalPath = path.join(flagsGlobalDir, "international.png");
if (!fs.existsSync(internationalPath)) missing.push(internationalPath);

if (missing.length) {
    console.error("[phone-flag-check] Missing files:");
    missing.forEach((m) => console.error(" - " + m));
    process.exit(2);
}

console.log("[phone-flag-check] OK. Checked " + files.length + " country flag files.");
