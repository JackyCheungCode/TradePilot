import { useEffect, useState, type ReactNode } from "react";
import {
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
} from "@carbon/react";
import { AgentOrbIcon } from "@/features/agent-center/presentation/components/AgentOrbIcon";
import tradePilotLogo from "@/assets/tradepilot-logo.svg";
import "./app-shell.css";

type AppPage =
  | "agentWorkbench" | "agentMarket" | "agentOrchestration" | "agentConnections" | "agentRuns" | "agentApprovals" | "agentSettings"
  | "orderQuotations" | "orderSales" | "orderPurchase"
  | "discovery" | "discoveryTasks" | "discoveryResults" | "searchDiscovery" | "facebookDiscovery" | "instagramDiscovery"
  | "leads" | "crmAccounts" | "crmContacts" | "crmOpportunities"
  | "enterpriseConfig" | "productConfig" | "productCatalog" | "integrations" | "searchExclusions" | "agentAppearance"
  | "orderCenter" | "documentWorkbench" | "documentCreate" | "documentRecords" | "documentTemplates";

type NavItem = { page: AppPage; label: string };
type NavGroup = { id: string; title: string; icon: string; pages: AppPage[]; items: NavItem[] };

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function AppShell({
  children,
  activePage,
  onNavigate,
  userEmail,
  onSignOut,
}: {
  children: ReactNode;
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  userEmail: string;
  onSignOut: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentExpanded, setAgentExpanded] = useState(true);
  const [discoveryExpanded, setDiscoveryExpanded] = useState(false);
  const [crmExpanded, setCrmExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(true);
  const [ordersExpanded, setOrdersExpanded] = useState(true);

  useEffect(() => {
    setAgentExpanded(["agentWorkbench", "agentMarket", "agentOrchestration", "agentConnections", "agentRuns", "agentApprovals", "agentSettings"].includes(activePage));
    setOrdersExpanded(activePage.startsWith("order"));
    setDocumentsExpanded(["documentWorkbench", "documentCreate", "documentRecords"].includes(activePage));
    setDiscoveryExpanded(["discovery", "discoveryTasks", "discoveryResults", "searchDiscovery", "facebookDiscovery", "instagramDiscovery"].includes(activePage));
    setCrmExpanded(["leads", "crmAccounts", "crmContacts", "crmOpportunities"].includes(activePage));
    setSettingsExpanded(["enterpriseConfig", "productConfig", "integrations", "searchExclusions", "agentAppearance", "documentTemplates"].includes(activePage));
  }, [activePage]);

  const closeMobile = () => setMobileOpen(false);
  const navigate = (page: AppPage) => {
    onNavigate(page);
    closeMobile();
  };
  const isSettingsPage = ["enterpriseConfig", "productConfig", "integrations", "searchExclusions", "agentAppearance", "documentTemplates"].includes(activePage);
  const isDiscoveryPage = ["discovery", "discoveryTasks", "discoveryResults", "searchDiscovery", "facebookDiscovery", "instagramDiscovery"].includes(activePage);
  const isCrmPage = ["leads", "crmAccounts", "crmContacts", "crmOpportunities"].includes(activePage);
  const isAgentPage = activePage.startsWith("agent");
  const pageTitle =
    activePage.startsWith("order") ? "订单中心" :
    activePage === "documentWorkbench" ? "单据工作台" :
    activePage === "documentCreate" ? "单据制作" :
    activePage === "documentRecords" ? "单据管理" :
    activePage === "documentTemplates" ? "模板中心" :
    activePage === "agentWorkbench" ? "Agent 工作台" :
    activePage === "agentMarket" ? "Agent 市场" :
    activePage === "agentOrchestration" ? "Agent 编排" :
    activePage === "agentConnections" ? "外部 Agent 接入" :
    activePage === "agentRuns" ? "Agent 执行记录" :
    activePage === "agentApprovals" ? "审批中心" :
    activePage === "agentSettings" ? "Agent 设置" :
    activePage === "integrations" ? "AI 与 API 集成" :
    activePage === "searchExclusions" ? "搜索排除规则" :
    activePage === "agentAppearance" ? "Agent 形象设计" :
    activePage === "leads" ? "线索" :
    activePage === "crmAccounts" ? "客户" :
    activePage === "crmContacts" ? "联系人" :
    activePage === "crmOpportunities" ? "商机" :
    activePage === "enterpriseConfig" ? "企业配置" :
    activePage === "productConfig" ? "产品基础配置" :
    activePage === "productCatalog" ? "产品资料" :
    activePage === "discoveryTasks" ? "任务执行中心" :
    activePage === "discoveryResults" ? "搜索结果" :
    activePage === "searchDiscovery" ? "搜索引擎发现" :
    activePage === "facebookDiscovery" ? "Facebook 发现" :
    activePage === "instagramDiscovery" ? "Instagram 发现" : "地图与本地商家";

  const groups: NavGroup[] = [
    {
      id: "agent", title: "TradePilot Agent 智能体", icon: "smart_toy",
      pages: ["agentWorkbench", "agentMarket", "agentOrchestration", "agentConnections", "agentRuns", "agentApprovals", "agentSettings"],
      items: [
        { page: "agentWorkbench", label: "Agent 工作台" },
        { page: "agentMarket", label: "Agent 市场" },
        { page: "agentOrchestration", label: "Agent 编排" },
        { page: "agentConnections", label: "外部 Agent 接入" },
        { page: "agentRuns", label: "执行记录" },
        { page: "agentApprovals", label: "审批中心" },
        { page: "agentSettings", label: "Agent 设置" },
      ],
    },
    {
      id: "orders", title: "订单中心", icon: "assignment",
      pages: ["orderQuotations", "orderSales", "orderPurchase"],
      items: [
        { page: "orderQuotations", label: "报价与询价" },
        { page: "orderSales", label: "销售业务" },
        { page: "orderPurchase", label: "采购业务" },
      ],
    },
    {
      id: "documents", title: "单据中心", icon: "folder_copy",
      pages: ["documentWorkbench", "documentCreate", "documentRecords"],
      items: [
        { page: "documentWorkbench", label: "单据工作台" },
        { page: "documentCreate", label: "单据制作" },
        { page: "documentRecords", label: "单据管理" },
      ],
    },
    {
      id: "discovery", title: "潜客发现", icon: "explore",
      pages: ["discovery", "discoveryTasks", "discoveryResults", "searchDiscovery", "facebookDiscovery", "instagramDiscovery"],
      items: [
        { page: "discovery", label: "地图与本地商家" },
        { page: "searchDiscovery", label: "搜索引擎发现" },
        { page: "facebookDiscovery", label: "Facebook 发现" },
        { page: "instagramDiscovery", label: "Instagram 发现" },
        { page: "discoveryTasks", label: "任务执行中心" },
        { page: "discoveryResults", label: "搜索结果" },
      ],
    },
    {
      id: "crm", title: "客户关系管理", icon: "group",
      pages: ["leads", "crmAccounts", "crmContacts", "crmOpportunities"],
      items: [
        { page: "leads", label: "线索" },
        { page: "crmAccounts", label: "客户" },
        { page: "crmContacts", label: "联系人" },
        { page: "crmOpportunities", label: "商机" },
      ],
    },
    {
      id: "settings", title: "系统设置", icon: "settings",
      pages: ["enterpriseConfig", "productConfig", "integrations", "searchExclusions", "agentAppearance", "documentTemplates"],
      items: [
        { page: "enterpriseConfig", label: "企业配置" },
        { page: "productConfig", label: "产品基础配置" },
        { page: "documentTemplates", label: "单据模板" },
        { page: "integrations", label: "AI 与 API 集成" },
        { page: "searchExclusions", label: "搜索排除规则" },
        { page: "agentAppearance", label: "Agent 形象设计" },
      ],
    },
  ];

  const groupExpanded: Record<string, boolean> = {
    agent: agentExpanded,
    orders: ordersExpanded,
    documents: documentsExpanded,
    discovery: discoveryExpanded,
    crm: crmExpanded,
    settings: settingsExpanded,
  };
  const setGroupExpanded: Record<string, (value: boolean) => void> = {
    agent: setAgentExpanded,
    orders: setOrdersExpanded,
    documents: setDocumentsExpanded,
    discovery: setDiscoveryExpanded,
    crm: setCrmExpanded,
    settings: setSettingsExpanded,
  };

  const sideNavigation = (
    <SideNav
      aria-label="TradePilot 主导航"
      isFixedNav
      expanded={!collapsed || mobileOpen}
      className="tp-carbon-side-nav"
    >
      <div className="tp-carbon-side-nav__inner">
        <SideNavItems>
        {groups.map((group) => (
          <SideNavMenu
            key={`${group.id}-${activePage}-${groupExpanded[group.id]}`}
            title={group.title}
            isActive={group.pages.includes(activePage)}
            defaultExpanded={groupExpanded[group.id]}
            renderIcon={() => <MaterialIcon name={group.icon} />}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) return;
              const wasExpanded = groupExpanded[group.id];
              setGroupExpanded[group.id](!wasExpanded);
              if (!wasExpanded) navigate(group.items[0].page);
            }}
          >
            {group.items.map((item) => (
              <SideNavMenuItem
                key={item.page}
                href="#"
                isActive={activePage === item.page}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.page);
                }}
              >
                {item.label}
              </SideNavMenuItem>
            ))}
          </SideNavMenu>
        ))}
        <SideNavLink
          href="#"
          isActive={activePage === "productCatalog"}
          renderIcon={() => <MaterialIcon name="inventory_2" />}
          onClick={(event) => {
            event.preventDefault();
            navigate("productCatalog");
          }}
        >
          产品资料
        </SideNavLink>
        </SideNavItems>
        <div className="tp-carbon-side-nav__footer">
          <div className="tp-carbon-side-nav__user" title={userEmail}>{userEmail}</div>
          <ul className="cds--side-nav__items">
          <SideNavLink
            href="#"
            renderIcon={() => <MaterialIcon name="logout" />}
            onClick={(event) => {
              event.preventDefault();
              onSignOut();
            }}
          >
            退出登录
          </SideNavLink>
          </ul>
        </div>
      </div>
    </SideNav>
  );

  return (
    <div className="tp-carbon-shell flex min-h-screen bg-background text-foreground">
      <aside className={`tp-carbon-sidebar hidden md:block ${collapsed ? "is-collapsed" : ""}`}>
        <div className="tp-carbon-sidebar__brand">
          {collapsed ? (
            <div className="tp-carbon-sidebar__mark" aria-label="TradePilot">
              <MaterialIcon name="radar" />
            </div>
          ) : (
            <img src={tradePilotLogo} alt="TradePilot" />
          )}
          <button
            type="button"
            className="tp-carbon-sidebar__collapse"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <MaterialIcon name={collapsed ? "left_panel_open" : "left_panel_close"} />
          </button>
        </div>
        {sideNavigation}
      </aside>

      {mobileOpen && (
        <div className="tp-carbon-mobile-nav md:hidden">
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="tp-carbon-mobile-nav__backdrop"
            onClick={closeMobile}
          />
          <aside className="tp-carbon-mobile-nav__panel">
            <div className="tp-carbon-sidebar__brand">
              <img src={tradePilotLogo} alt="TradePilot" />
              <button type="button" className="tp-carbon-sidebar__collapse" aria-label="关闭菜单" onClick={closeMobile}>
                <MaterialIcon name="close" />
              </button>
            </div>
            {sideNavigation}
          </aside>
        </div>
      )}

      <main className="tp-carbon-main min-w-0 flex-1">
        <Header aria-label="TradePilot 工作区" className="tp-carbon-header">
          <SkipToContent href="#main-content">跳转到主要内容</SkipToContent>
          <div className="md:hidden">
            <HeaderMenuButton
              aria-label="打开侧边栏菜单"
              isActive={mobileOpen}
              onClick={() => setMobileOpen(true)}
            />
          </div>
          <div className="hidden md:block">
            <HeaderMenuButton
              aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
              isActive={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            />
          </div>
          <HeaderName href="#" prefix="" onClick={(event) => event.preventDefault()}>
            <img src={tradePilotLogo} alt="TradePilot" className="tp-carbon-header__logo" />
          </HeaderName>
          <div className="tp-carbon-header__context">
            <span>工作区</span>
            <span aria-hidden="true">/</span>
            <span>{isSettingsPage ? "设置" : isAgentPage ? "Agent" : activePage.startsWith("order") ? "订单中心" : activePage === "productCatalog" ? "产品资料" : activePage.startsWith("document") ? "单据中心" : isDiscoveryPage ? "潜客发现" : isCrmPage ? "客户关系管理" : "业务数据"}</span>
            <span aria-hidden="true">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <HeaderGlobalBar>
            <HeaderGlobalAction
              aria-label="打开小雅 Agent 工作台"
              onClick={() => navigate("agentWorkbench")}
              tooltipAlignment="end"
            >
              <AgentOrbIcon agentKey="default" className="h-8 w-8" sizePx={32} state={activePage === "agentWorkbench" ? "happy" : "idle"} />
            </HeaderGlobalAction>
          </HeaderGlobalBar>
        </Header>
        <div id="main-content" className="tp-page-canvas" tabIndex={-1}>{children}</div>
      </main>
    </div>
  );
}
