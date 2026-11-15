import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  Content,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
} from "@carbon/react";
import { Bot, Task, Folder, Explore, Group, Settings, InventoryManagement, Logout, Radar, SidePanelOpen, SidePanelClose, Close, Search, Notification, UserAvatar } from "@carbon/icons-react";
import tradePilotLogo from "@/assets/tradepilot-logo.svg";
import "./app-shell.css";
import "./app-shell-header.scss";

type AppPage =
  | "agentWorkbench" | "agentMarket" | "agentOrchestration" | "agentConnections" | "agentRuns" | "agentApprovals" | "agentSettings"
  | "orderQuotations" | "orderSales" | "orderPurchase"
  | "discovery" | "discoveryTasks" | "discoveryResults" | "searchDiscovery" | "facebookDiscovery" | "instagramDiscovery"
  | "leads" | "crmAccounts" | "crmContacts" | "crmOpportunities"
  | "enterpriseConfig" | "productConfig" | "productCatalog" | "integrations" | "searchExclusions" | "agentAppearance"
  | "orderCenter" | "documentWorkbench" | "documentCreate" | "documentRecords" | "documentTemplates";

type NavItem = { page: AppPage; label: string };
type NavGroup = { id: string; title: string; icon: string; pages: AppPage[]; items: NavItem[]; navigateOnExpand?: boolean };

const carbonNavIcons: Record<string, ElementType> = {
  smart_toy: Bot,
  assignment: Task,
  folder_copy: Folder,
  explore: Explore,
  group: Group,
  settings: Settings,
  inventory_2: InventoryManagement,
  logout: Logout,
  radar: Radar,
  left_panel_open: SidePanelOpen,
  left_panel_close: SidePanelClose,
  close: Close,
};

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  const Icon = carbonNavIcons[name] ?? Folder;
  return <Icon size={20} className={className} aria-hidden="true" />;
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

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileOpen]);

  const navigate = (page: AppPage) => {
    onNavigate(page);
    closeMobile();
  };


  const groups: NavGroup[] = [
    {
      id: "agent", title: "TradePilot Agent 智能体", icon: "smart_toy", navigateOnExpand: true,
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
      id: "orders", title: "订单中心", icon: "assignment", navigateOnExpand: true,
      pages: ["orderQuotations", "orderSales", "orderPurchase"],
      items: [
        { page: "orderQuotations", label: "报价与询价" },
        { page: "orderSales", label: "销售业务" },
        { page: "orderPurchase", label: "采购业务" },
      ],
    },
    {
      id: "documents", title: "单据中心", icon: "folder_copy", navigateOnExpand: true,
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
        <SideNavItems className="tp-carbon-side-nav__items">
          <SideNavLink href="#" isActive={activePage.startsWith("agent")} renderIcon={() => <MaterialIcon name="smart_toy" />} onClick={(event) => { event.preventDefault(); navigate("agentWorkbench"); }}>Agent 工作台</SideNavLink>
          <SideNavLink href="#" isActive={["discovery", "discoveryTasks", "discoveryResults", "searchDiscovery", "facebookDiscovery", "instagramDiscovery"].includes(activePage)} renderIcon={() => <MaterialIcon name="explore" />} onClick={(event) => { event.preventDefault(); navigate("discovery"); }}>潜客发现</SideNavLink>
          <SideNavLink href="#" isActive={activePage.startsWith("order")} renderIcon={() => <MaterialIcon name="assignment" />} onClick={(event) => { event.preventDefault(); navigate("orderQuotations"); }}>订单中心</SideNavLink>
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
              if (!wasExpanded && group.navigateOnExpand) navigate(group.items[0].page);
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
          <div className="tp-carbon-side-nav__user cds--type-helper-text-01" title={userEmail}>{userEmail}</div>
          <ul className="tp-carbon-side-nav__footer-items">
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
          <HeaderGlobalAction
            className="tp-carbon-sidebar__collapse"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <MaterialIcon name={collapsed ? "left_panel_open" : "left_panel_close"} />
          </HeaderGlobalAction>
        </div>
        {sideNavigation}
      </aside>

      {mobileOpen && (
        <div className="tp-carbon-mobile-nav md:hidden" role="dialog" aria-modal="true" aria-label="TradePilot 主导航">
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="tp-carbon-mobile-nav__backdrop"
            onClick={closeMobile}
          />
          <aside className="tp-carbon-mobile-nav__panel">
            <div className="tp-carbon-sidebar__brand">
              <img src={tradePilotLogo} alt="TradePilot" />
              <HeaderGlobalAction className="tp-carbon-sidebar__collapse" aria-label="关闭菜单" onClick={closeMobile}>
                <MaterialIcon name="close" />
              </HeaderGlobalAction>
            </div>
            {sideNavigation}
          </aside>
        </div>
      )}

      <main className="tp-carbon-main min-w-0 flex-1">
        <Header aria-label="TradePilot 主导航">
          <SkipToContent href="#main-content">跳转到主要内容</SkipToContent>
          <div className="tp-header-mobile-menu">
            <HeaderMenuButton
              isCollapsible
              aria-label={mobileOpen ? "关闭主导航" : "打开主导航"}
              isActive={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
            />
          </div>
          <HeaderName href="#" prefix="TradePilot" onClick={(event) => event.preventDefault()}>
            工作区
          </HeaderName>
          <HeaderNavigation aria-label="TradePilot 一级导航" className="tp-header-navigation">
            <HeaderMenuItem href="#" isActive={activePage.startsWith("agent")} onClick={(event) => { event.preventDefault(); navigate("agentWorkbench"); }}>Agent 工作台</HeaderMenuItem>
            <HeaderMenuItem href="#" isActive={["discovery", "discoveryTasks", "discoveryResults", "searchDiscovery", "facebookDiscovery", "instagramDiscovery"].includes(activePage)} onClick={(event) => { event.preventDefault(); navigate("discovery"); }}>潜客发现</HeaderMenuItem>
            <HeaderMenuItem href="#" isActive={activePage.startsWith("order")} onClick={(event) => { event.preventDefault(); navigate("orderQuotations"); }}>订单中心</HeaderMenuItem>
          </HeaderNavigation>
          <HeaderGlobalBar>
            <HeaderGlobalAction aria-label="搜索" tooltipAlignment="center">
              <Search size={20} />
            </HeaderGlobalAction>
            <HeaderGlobalAction aria-label="通知" tooltipAlignment="center">
              <Notification size={20} />
            </HeaderGlobalAction>
            <HeaderGlobalAction aria-label="用户账户" tooltipAlignment="end">
              <UserAvatar size={20} />
            </HeaderGlobalAction>
          </HeaderGlobalBar>
        </Header>
        <Content id="main-content" tagName="div" className="tp-page-canvas">
          <div className="tp-page-root">{children}</div>
        </Content>
      </main>
    </div>
  );
}
