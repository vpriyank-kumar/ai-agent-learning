import { callAtlassianTool } from "./atlassian-mcp-connect.js";

const DEFAULT_OPEN_ISSUES_JQL = [
  'priority in ("P0- Highest", "P1", "P1 - High")',
  "AND statusCategory != Done",
  "ORDER BY priority ASC, updated DESC",
].join(" ");

/**
 * JQL used when the user asks about the R&D customer-reported dashboard.
 * Override in .env with JIRA_OPEN_ISSUES_JQL to match the exact dashboard filter.
 */
export function getOpenIssuesJql() {
  const fromEnv = process.env.JIRA_OPEN_ISSUES_JQL?.trim();
  return fromEnv || DEFAULT_OPEN_ISSUES_JQL;
}

function cloudId() {
  return process.env.ATLASSIAN_SITE_URL?.trim();
}

function pickEvidenceField(fields, label) {
  const direct = fields?.[label];
  if (direct !== undefined && direct !== null) {
    return direct.value ?? direct;
  }

  const custom = fields?.customFields?.[label];
  if (custom !== undefined && custom !== null) {
    return custom.value ?? custom;
  }

  return null;
}

/**
 * Fetch open issues plus last-comment hints for the dashboard workflow.
 */
export async function fetchOpenIssuesSnapshot(mcpClient, maxIssues = 12) {
  const site = cloudId();
  if (!site) {
    return {
      error:
        "ATLASSIAN_SITE_URL is missing. Set it in .env (for example https://yourorg.atlassian.net).",
    };
  }

  const userInfo = await callAtlassianTool(mcpClient, "atlassianUserInfo", {});
  const accountId = userInfo?.data?.accountId ?? null;

  const search = await callAtlassianTool(
    mcpClient,
    "searchJiraIssuesUsingJql",
    {
      cloudId: site,
      jql: getOpenIssuesJql(),
      maxResults: maxIssues,
      view: "compact",
    }
  );

  const issues = search?.data?.issues ?? [];
  const enriched = [];

  for (const row of issues) {
    const key = row.key;
    const detail = await callAtlassianTool(mcpClient, "getJiraIssue", {
      cloudId: site,
      issueIdOrKey: key,
      view: "evidence",
    });

    const fields = detail?.data?.fields ?? {};
    const lastComment = pickEvidenceField(fields, "Last Comment");
    const lastCommenter = pickEvidenceField(fields, "Last Commenter");
    const commentCount =
      pickEvidenceField(fields, "Comment Count") ??
      fields?.comment?.total ??
      null;

    const assigneeAccountId =
      row.fields?.assignee?.accountId ??
      fields?.assignee?.accountId ??
      null;

    enriched.push({
      key,
      summary: row.fields?.summary ?? fields?.summary,
      priority: row.fields?.priority?.name ?? fields?.priority?.name,
      status: row.fields?.status?.name ?? fields?.status?.name,
      assignee:
        row.fields?.assignee?.displayName ?? fields?.assignee?.displayName,
      assigneeIsCurrentUser: Boolean(
        accountId && assigneeAccountId === accountId
      ),
      commentCount,
      lastComment,
      lastCommenter,
      browseUrl: `${site.replace(/\/$/, "")}/browse/${key}`,
    });
  }

  return {
    dashboardName:
      process.env.JIRA_DASHBOARD_NAME?.trim() ||
      "R&D team - Customer reported Open Issues",
    dashboardUrl:
      process.env.JIRA_DASHBOARD_URL?.trim() ||
      "https://structuredweb.atlassian.net/jira/dashboards/10120",
    jqlUsed: getOpenIssuesJql(),
    fetchedAt: new Date().toISOString(),
    currentUserAccountId: accountId,
    issueCount: enriched.length,
    issues: enriched,
  };
}

/**
 * True when the user is asking for the daily open-issue / dashboard summary.
 */
export function isOpenIssuesDashboardQuestion(message) {
  const text = message.toLowerCase();
  const signals = [
    "open issue",
    "open issues",
    "p0",
    "p1",
    "customer reported",
    "dashboard",
    "today",
    "last comment",
    "comments for me",
  ];
  return signals.some((phrase) => text.includes(phrase));
}
