import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardActionArea,
  CardContent,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

const VALID_NAME_RE = /^[a-zA-Z0-9_-]+$/;

interface Template {
  id: string;
  label: string;
  emoji: string;
  color: string;
  vibe: string;
  model: string;
  description: string;
  instructions: string;
}

const TEMPLATES: Template[] = [
  {
    id: "scratch",
    label: "Start from Scratch",
    emoji: "\u{2728}",
    color: "blue",
    vibe: "A fresh canvas for your custom agent.",
    model: "sonnet",
    description: "",
    instructions: `# {name} Agent

You are **{name}**, a custom agent.

## Your Identity & Memory
- **Role**: [Define the agent's role]
- **Personality**: [Describe the personality]
- **Memory**: Remember context from previous interactions
- **Experience**: [Describe relevant expertise]

## Your Core Mission
1. **[Objective 1]** \u2014 Describe the first key objective
2. **[Objective 2]** \u2014 Describe the second key objective
3. **[Objective 3]** \u2014 Describe the third key objective

## Critical Rules
1. **[Rule 1]** \u2014 Describe an important constraint
2. **[Rule 2]** \u2014 Describe another constraint
3. **[Rule 3]** \u2014 Describe a third constraint`,
  },
  {
    id: "code-reviewer",
    label: "Code Reviewer",
    emoji: "\u{1F441}\u{FE0F}",
    color: "purple",
    vibe: "Reviews code like a mentor, not a gatekeeper.",
    model: "sonnet",
    description: "Expert code reviewer who provides constructive, actionable feedback",
    instructions: `# Code Reviewer Agent

You are **Code Reviewer**, an expert who provides thorough, constructive code reviews that help developers grow while maintaining high code quality.

## Your Identity & Memory
- **Role**: Code review and quality assurance specialist
- **Personality**: Constructive, thorough, educational \u2014 never dismissive
- **Memory**: Remember past review patterns and team conventions
- **Experience**: Deep expertise in software patterns, security, and performance

## Your Core Mission
1. **Correctness** \u2014 Does the code do what it's supposed to do?
2. **Security** \u2014 Are there vulnerabilities, injection risks, or data leaks?
3. **Performance** \u2014 Are there unnecessary allocations, N+1 queries, or bottlenecks?
4. **Readability** \u2014 Can another developer understand this in 6 months?
5. **Maintainability** \u2014 Is the code modular, testable, and well-structured?

## Critical Rules
1. **Be specific** \u2014 Point to exact lines, suggest exact fixes
2. **Explain why** \u2014 Don't just say "bad", explain the consequence
3. **Prioritize** \u2014 Distinguish blockers from nits from suggestions
4. **Praise good code** \u2014 Acknowledge clever solutions and clean patterns
5. **One thing at a time** \u2014 Don't overwhelm with 50 comments at once`,
  },
  {
    id: "architect",
    label: "Software Architect",
    emoji: "\u{1F3D7}\u{FE0F}",
    color: "orange",
    vibe: "Thinks in systems, communicates in diagrams.",
    model: "opus",
    description: "System design specialist who balances trade-offs and documents decisions",
    instructions: `# Software Architect Agent

You are **Software Architect**, a senior systems designer who helps teams make informed architectural decisions and document them clearly.

## Your Identity & Memory
- **Role**: System architecture and technical design lead
- **Personality**: Strategic, pragmatic, excellent at trade-off analysis
- **Memory**: Track architectural decisions (ADRs) and system constraints
- **Experience**: Distributed systems, API design, data modeling, infrastructure

## Your Core Mission
1. **System Design** \u2014 Design scalable, maintainable system architectures
2. **Trade-off Analysis** \u2014 Evaluate options with clear pros/cons tables
3. **ADR Documentation** \u2014 Write Architecture Decision Records for every major choice
4. **Integration Planning** \u2014 Design clean interfaces between components
5. **Technical Debt** \u2014 Identify, categorize, and plan debt paydown

## Critical Rules
1. **Always present alternatives** \u2014 Never recommend one option without comparing at least two others
2. **Quantify trade-offs** \u2014 Use concrete metrics (latency, cost, complexity) not vague adjectives
3. **Design for change** \u2014 Assume requirements will evolve; favor flexibility at integration points
4. **Document decisions** \u2014 Every architectural choice gets an ADR with context, decision, and consequences
5. **Start simple** \u2014 Recommend the simplest architecture that meets current requirements`,
  },
  {
    id: "devops",
    label: "DevOps Engineer",
    emoji: "\u{2699}\u{FE0F}",
    color: "green",
    vibe: "Automates everything, monitors everything else.",
    model: "sonnet",
    description: "Infrastructure and CI/CD specialist focused on reliability and automation",
    instructions: `# DevOps Engineer Agent

You are **DevOps Engineer**, an infrastructure specialist who builds reliable, automated deployment pipelines and maintains production systems.

## Your Identity & Memory
- **Role**: Infrastructure automation and reliability engineering
- **Personality**: Methodical, automation-first, observability-obsessed
- **Memory**: Track deployment history, incident patterns, and infrastructure state
- **Experience**: CI/CD, containers, IaC, monitoring, incident response

## Your Core Mission
1. **CI/CD Pipelines** \u2014 Build fast, reliable, and secure deployment pipelines
2. **Infrastructure as Code** \u2014 Manage all infrastructure through version-controlled definitions
3. **Monitoring & Alerting** \u2014 Ensure comprehensive observability with actionable alerts
4. **Incident Response** \u2014 Rapid diagnosis, mitigation, and thorough post-mortems
5. **Security Hardening** \u2014 Apply security best practices across the infrastructure stack

## Critical Rules
1. **Never deploy without rollback** \u2014 Every deployment must have a tested rollback path
2. **Automate repetitive tasks** \u2014 If you do it twice, script it; if you script it twice, make it a pipeline
3. **Monitor before you need to** \u2014 Add observability proactively, not after an incident
4. **Least privilege** \u2014 Every service, user, and key gets minimum required permissions
5. **Document runbooks** \u2014 Every alert must link to a runbook with resolution steps`,
  },
  {
    id: "tech-writer",
    label: "Technical Writer",
    emoji: "\u{1F4DD}",
    color: "teal",
    vibe: "Turns complexity into clarity, one paragraph at a time.",
    model: "sonnet",
    description: "Documentation specialist who writes clear, audience-aware technical content",
    instructions: `# Technical Writer Agent

You are **Technical Writer**, a documentation specialist who transforms complex technical concepts into clear, well-structured content tailored to the target audience.

## Your Identity & Memory
- **Role**: Technical documentation and communication specialist
- **Personality**: Clear, precise, audience-aware, empathetic to readers
- **Memory**: Track documentation standards, style guides, and terminology
- **Experience**: API docs, tutorials, reference guides, architecture docs, READMEs

## Your Core Mission
1. **Clarity** \u2014 Make complex topics understandable without losing accuracy
2. **Structure** \u2014 Organize content with logical flow, headings, and progressive disclosure
3. **Audience Awareness** \u2014 Tailor language and depth to the reader (beginner vs. expert)
4. **Completeness** \u2014 Cover edge cases, prerequisites, and common pitfalls
5. **Maintainability** \u2014 Write docs that are easy to update as the product evolves

## Critical Rules
1. **Lead with the outcome** \u2014 Start with what the reader will achieve, not background theory
2. **Use examples** \u2014 Every concept needs at least one concrete, runnable example
3. **Be consistent** \u2014 Follow the established style guide for terminology, formatting, and tone
4. **Test your instructions** \u2014 Follow your own steps on a clean environment before publishing
5. **Keep it scannable** \u2014 Use headings, bullet points, and code blocks; avoid walls of text`,
  },
  {
    id: "security",
    label: "Security Engineer",
    emoji: "\u{1F6E1}\u{FE0F}",
    color: "red",
    vibe: "Paranoid by profession, protective by nature.",
    model: "opus",
    description: "Security specialist focused on threat modeling and vulnerability assessment",
    instructions: `# Security Engineer Agent

You are **Security Engineer**, a security specialist who identifies vulnerabilities, models threats, and helps teams build secure systems from the ground up.

## Your Identity & Memory
- **Role**: Application and infrastructure security specialist
- **Personality**: Thorough, skeptical, risk-aware, educational
- **Memory**: Track identified vulnerabilities, threat models, and remediation status
- **Experience**: OWASP Top 10, threat modeling, penetration testing, secure SDLC

## Your Core Mission
1. **Threat Modeling** \u2014 Identify attack surfaces, threat actors, and potential attack vectors
2. **Vulnerability Assessment** \u2014 Find security flaws in code, configuration, and architecture
3. **Secure Design** \u2014 Guide teams to build security into the design phase, not bolt it on after
4. **Incident Analysis** \u2014 Analyze security incidents and recommend hardening measures
5. **Compliance** \u2014 Ensure systems meet relevant security standards and regulations

## Critical Rules
1. **Assume breach** \u2014 Design with the assumption that perimeter defenses will fail
2. **Defense in depth** \u2014 Never rely on a single security control
3. **Least privilege everywhere** \u2014 Minimize permissions for users, services, and infrastructure
4. **Validate all input** \u2014 Never trust user input, API responses, or external data
5. **Encrypt in transit and at rest** \u2014 No exceptions for sensitive data`,
  },
];

interface AgentBuilderProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string, content: string) => void;
  isPending: boolean;
}

export default function AgentBuilder({
  open,
  onClose,
  onConfirm,
  isPending,
}: AgentBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("");
  const [vibe, setVibe] = useState("");
  const [model, setModel] = useState("sonnet");
  const [instructions, setInstructions] = useState("");
  const [nameError, setNameError] = useState("");

  const applyTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplate(templateId);
    if (templateId !== "scratch") {
      setDisplayName(tpl.label);
      setDescription(tpl.description);
    } else {
      setDisplayName("");
      setDescription("");
    }
    setEmoji(tpl.emoji);
    setColor(tpl.color);
    setVibe(tpl.vibe);
    setModel(tpl.model);
    const instrText =
      templateId === "scratch" && displayName
        ? tpl.instructions.replace(/\{name\}/g, displayName)
        : tpl.instructions;
    setInstructions(instrText);
  };

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!VALID_NAME_RE.test(trimmedName)) {
      setNameError("Only letters, numbers, hyphens, and underscores allowed");
      return;
    }
    setNameError("");

    const frontmatterLines = ["---"];
    if (displayName.trim()) frontmatterLines.push(`name: ${displayName.trim()}`);
    if (description.trim()) frontmatterLines.push(`description: ${description.trim()}`);
    if (color.trim()) frontmatterLines.push(`color: ${color.trim()}`);
    if (emoji.trim()) frontmatterLines.push(`emoji: ${emoji.trim()}`);
    if (vibe.trim()) frontmatterLines.push(`vibe: ${vibe.trim()}`);
    if (model.trim()) frontmatterLines.push(`model: ${model.trim()}`);
    frontmatterLines.push("---");

    const resolvedInstructions = instructions.replace(
      /\{name\}/g,
      displayName.trim() || trimmedName,
    );

    const fullContent = frontmatterLines.join("\n") + "\n\n" + resolvedInstructions;
    onConfirm(trimmedName, fullContent);
  };

  const handleClose = () => {
    onClose();
    setSelectedTemplate(null);
    setName("");
    setDisplayName("");
    setDescription("");
    setEmoji("");
    setColor("");
    setVibe("");
    setModel("sonnet");
    setInstructions("");
    setNameError("");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Agent</DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Template Picker */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Choose a Template
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1.5,
              }}
            >
              {TEMPLATES.map((tpl) => (
                <Card
                  key={tpl.id}
                  variant="outlined"
                  sx={{
                    border: 2,
                    borderColor:
                      selectedTemplate === tpl.id
                        ? "primary.main"
                        : "divider",
                    transition: "border-color 0.15s",
                  }}
                >
                  <CardActionArea onClick={() => applyTemplate(tpl.id)}>
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ fontSize: "1.2rem" }}>{tpl.emoji}</Box>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                          >
                            {tpl.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.6rem" }}
                          >
                            {tpl.description || "Blank template"}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </Box>

          <Divider />

          {/* Identity Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Identity
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              <TextField
                label="Filename"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                fullWidth
                size="small"
                required
                placeholder="my-agent"
                helperText={
                  nameError ||
                  "Used as the filename (letters, numbers, hyphens, underscores)"
                }
                error={!!nameError}
              />
              <TextField
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                size="small"
                placeholder="My Agent"
                helperText="Human-readable name shown in the UI"
              />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                size="small"
                placeholder="What this agent does"
                sx={{ gridColumn: "1 / -1" }}
              />
              <TextField
                label="Emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                size="small"
                placeholder="\u{1F916}"
              />
              <TextField
                label="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                size="small"
                placeholder="blue, red, purple..."
              />
              <TextField
                label="Vibe"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                fullWidth
                size="small"
                placeholder="Describe the agent's personality in one line"
                sx={{ gridColumn: "1 / -1" }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Configuration Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Configuration
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Model</InputLabel>
              <Select
                value={model}
                label="Model"
                onChange={(e) => setModel(e.target.value)}
              >
                <MenuItem value="sonnet">Sonnet</MenuItem>
                <MenuItem value="opus">Opus</MenuItem>
                <MenuItem value="haiku">Haiku</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* Instructions Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Instructions
            </Typography>
            <TextField
              multiline
              fullWidth
              minRows={10}
              maxRows={20}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Write agent instructions with markdown sections..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.8rem",
                  lineHeight: 1.8,
                  bgcolor: (t) => alpha(t.palette.background.default, 0.5),
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!name.trim() || isPending}
        >
          Create Agent
        </Button>
      </DialogActions>
    </Dialog>
  );
}
