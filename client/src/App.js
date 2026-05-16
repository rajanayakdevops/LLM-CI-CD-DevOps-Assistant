import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:8081/api";

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [logs, setLogs] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [buildInfo, setBuildInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState("logs");
  const intervalRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/jobs`)
      .then((res) => { setJobs(res.data); setSelectedJob(res.data[0] || ""); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        if (selectedJob) fetchLogs(selectedJob);
      }, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, selectedJob]);

  const fetchLogs = async (job) => {
    const jobName = job || selectedJob;
    setLoadingLogs(true);
    setError("");
    setAnalysis("");
    try {
      const res = await axios.get(`${API}/logs?job=${jobName}`);
      setLogs(res.data.logs);
      setBuildInfo(res.data);
      fetchHistory(jobName);
      setActiveTab("logs");
    } catch (err) {
      setError("Failed to fetch logs. Make sure Jenkins is running.");
    }
    setLoadingLogs(false);
  };

  const fetchHistory = async (jobName) => {
    try {
      const res = await axios.get(`${API}/history?job=${jobName}`);
      setHistory(res.data);
    } catch (err) {}
  };

  const analyzeLogs = async () => {
    if (!logs) return;
    setLoadingAI(true);
    setError("");
    setActiveTab("analysis");
    try {
      const res = await axios.post(`${API}/analyze`, {
        logs,
        jobName: buildInfo?.jobName,
        buildNumber: buildInfo?.buildNumber,
      });
      setAnalysis(res.data);
    } catch (err) {
      setError("AI analysis failed. Check your Gemini API key.");
    }
    setLoadingAI(false);
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status) => {
    if (status === "SUCCESS") return "badge badge-success";
    if (status === "FAILURE") return "badge badge-failure";
    return "badge badge-running";
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">DevOps Assistant</div>
          <div className="logo-sub">Jenkins Log Analyzer</div>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
            Console Logs
          </button>
          <button className={`nav-item ${activeTab === "analysis" ? "active" : ""}`} onClick={() => setActiveTab("analysis")}>
            AI Analysis
          </button>
          <button className={`nav-item ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            Build History
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="connection-status">
            <span className="dot green"></span> Jenkins Connected
          </div>
          <div className="connection-status">
            <span className="dot green"></span> mysql connected.
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Navbar */}
        <header className="navbar">
          <div className="navbar-left">
            <h1 className="page-title">Build Dashboard</h1>
            <span className="breadcrumb">{selectedJob || "Select a job"}</span>
          </div>
          <div className="navbar-right">
            <select className="job-select" value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
              {jobs.map((job) => <option key={job} value={job}>{job}</option>)}
            </select>
            <button className={`btn btn-ghost ${autoRefresh ? "btn-active" : ""}`} onClick={() => setAutoRefresh(!autoRefresh)}>
              {autoRefresh ? "Auto Refresh ON" : "Auto Refresh"}
            </button>
            <button className="btn btn-primary" onClick={() => fetchLogs()} disabled={loadingLogs}>
              {loadingLogs ? <span className="spinner"></span> : null}
              {loadingLogs ? "Fetching..." : "Fetch Logs"}
            </button>
            <button className="btn btn-ai" onClick={analyzeLogs} disabled={!logs || loadingAI}>
              {loadingAI ? <span className="spinner"></span> : null}
              {loadingAI ? "Analyzing..." : "Analyze with AI"}
            </button>
          </div>
        </header>

        {error && <div className="alert">{error}</div>}

        {/* Stat Cards */}
        {buildInfo && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Job Name</div>
              <div className="stat-value">{buildInfo.jobName}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Build Number</div>
              <div className="stat-value">#{buildInfo.buildNumber}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value">
                <span className={getStatusBadge(buildInfo.status)}>{buildInfo.status}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Duration</div>
              <div className="stat-value">{buildInfo.duration}s</div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="content-area">

          {activeTab === "logs" && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Console Output</span>
                {logs && (
                  <button className="btn btn-sm" onClick={copyLogs}>
                    {copied ? "Copied!" : "Copy Logs"}
                  </button>
                )}
              </div>
              <div className="panel-body">
                {logs
                  ? <pre className="log-output">{logs}</pre>
                  : <div className="empty-state">
                      <p>No logs fetched yet.</p>
                      <p>Select a job and click <strong>Fetch Logs</strong> to begin.</p>
                    </div>
                }
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">AI Analysis</span>
              </div>
              <div className="panel-body">
                {loadingAI
                  ? <div className="loading-state">
                      <div className="spinner-lg"></div>
                      <p>Gemini AI is analyzing your logs...</p>
                    </div>
                  : analysis
                    ? <div className="analysis-output">{analysis}</div>
                    : <div className="empty-state">
                        <p>No analysis yet.</p>
                        <p>Fetch logs first, then click <strong>Analyze with AI</strong>.</p>
                      </div>
                }
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Build History</span>
              </div>
              <div className="panel-body">
                {history.length > 0
                  ? <table className="data-table">
                      <thead>
                        <tr>
                          <th>Build</th>
                          <th>Status</th>
                          <th>Duration</th>
                          <th>AI Analysis</th>
                          <th>Saved At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((b) => (
                          <tr key={b.buildNumber}>
                            <td><span className="build-num">#{b.buildNumber}</span></td>
                            <td><span className={getStatusBadge(b.status)}>{b.status}</span></td>
                            <td>{b.duration}s</td>
                            <td className="analysis-col">
                              {b.analysis
                                ? expanded === b.buildNumber
                                  ? <><span>{b.analysis}</span> <button className="link-btn" onClick={() => setExpanded(null)}>less</button></>
                                  : <><span>{b.analysis.slice(0, 80)}...</span> <button className="link-btn" onClick={() => setExpanded(b.buildNumber)}>more</button></>
                                : <span className="muted">—</span>}
                            </td>
                            <td className="muted">{new Date(b.savedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  : <div className="empty-state">
                      <p>No build history yet.</p>
                      <p>Fetch logs to start saving build records.</p>
                    </div>
                }
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
