import { useLayoutEffect, useRef, useState, type Dispatch } from "react";
import type { SecretaryId } from "../game/types";
import { officeSiteLabel } from "../game/constants";
import { secretaryPostedOffice } from "../game/secretaryPosting";
import {
  MAX_SKILL_RANK,
  skillTreesFor,
  type SkillNodeDef,
  type SkillTreeDef,
} from "../game/secretarySkillData";
import {
  canIncreaseSkillRank,
  diagramTiers,
  gateLabel,
  perRankEffectLine,
  totalEffectLine,
  type SecretarySkillTreeKey,
} from "../game/secretarySkillLogic";
import type { GameAction, GameState, SecretaryProgress } from "../game/types";

type Props = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  secretaryId: SecretaryId;
  progress: SecretaryProgress;
};

function pointsInTree(
  tree: SkillTreeDef,
  ranks: Record<string, number>,
): number {
  return tree.nodes.reduce((sum, node) => sum + (ranks[node.id] ?? 0), 0);
}

function SkillNodeCard({
  treeKey,
  tree,
  node,
  ranks,
  unspent,
  officeLabel,
  onSpend,
}: {
  treeKey: SecretarySkillTreeKey;
  tree: SkillTreeDef;
  node: SkillNodeDef;
  ranks: Record<string, number>;
  unspent: number;
  officeLabel: string;
  onSpend: () => void;
}) {
  const rank = ranks[node.id] ?? 0;
  const locked = rank === 0 && !canIncreaseSkillRank(tree, ranks, node, unspent);
  const maxed = rank >= node.maxRank || rank >= MAX_SKILL_RANK;
  const canUp = canIncreaseSkillRank(tree, ranks, node, unspent);
  const gate = gateLabel(tree, ranks, node);
  const detail =
    treeKey === "onSite"
      ? `${totalEffectLine(rank, node)} · ${officeLabel} only`
      : totalEffectLine(rank, node);

  return (
    <article
      className={`secretary-skill-node${locked ? " locked" : ""}${
        maxed ? " maxed" : ""
      }${canUp ? " can-level" : ""}`}
    >
      <button
        type="button"
        className="secretary-skill-node-hit"
        disabled={!canUp}
        onClick={onSpend}
      >
        <div className="name">
          {node.label}
          <span className="rank">
            Lv {rank}/{Math.min(node.maxRank, MAX_SKILL_RANK)}
          </span>
        </div>
        <div className="effect">
          <span className="effect-per">{perRankEffectLine(node)}</span>
          <span className="effect-detail">{detail}</span>
        </div>
        {gate ? (
          <div className="gate">{gate}</div>
        ) : (
          <div className="gate secretary-skill-gate-spacer" aria-hidden="true">
            &nbsp;
          </div>
        )}
      </button>
    </article>
  );
}

function SkillTreeDiagram({
  treeKey,
  tree,
  ranks,
  unspent,
  officeLabel,
  onSpend,
}: {
  treeKey: SecretarySkillTreeKey;
  tree: SkillTreeDef;
  ranks: Record<string, number>;
  unspent: number;
  officeLabel: string;
  onSpend: (nodeId: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tiers = diagramTiers(tree);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const diagram = root.querySelector(".secretary-skill-diagram");
    const svg = root.querySelector("svg");
    if (!(diagram instanceof HTMLElement) || !(svg instanceof SVGSVGElement)) {
      return;
    }
    const origin = diagram.getBoundingClientRect();
    const paths: string[] = [];
    for (const item of tree.nodes) {
      if (!item.requires) continue;
      const from = diagram.querySelector(
        `[data-node-id="${item.requires}"] .secretary-skill-node-hit`,
      );
      const to = diagram.querySelector(
        `[data-node-id="${item.id}"] .secretary-skill-node-hit`,
      );
      if (!(from instanceof HTMLElement) || !(to instanceof HTMLElement)) continue;
      const f = from.getBoundingClientRect();
      const t = to.getBoundingClientRect();
      const x1 = f.left + f.width / 2 - origin.left;
      const y1 = f.bottom - origin.top + 2;
      const x2 = t.left + t.width / 2 - origin.left;
      const y2 = t.top - origin.top - 2;
      const mid = y1 + (y2 - y1) * 0.45;
      paths.push(
        `M ${x1} ${y1} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2}`,
      );
    }
    const w = diagram.clientWidth;
    const h = diagram.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.innerHTML = paths
      .map((d) => `<path d="${d}" />`)
      .join("");
  }, [tree, ranks, unspent]);

  const note =
    treeKey === "onSite"
      ? `At posted office only · ${officeLabel}`
      : tree.note;

  return (
    <section className="secretary-skill-tree-panel" ref={rootRef}>
      <p className="secretary-skill-leveling-note">
        <strong>Leveling:</strong> Each tap spends <strong>1 skill point</strong> and
        adds <strong>1 rank</strong>. Ranks stack (e.g. 3× −2%/rank = −6% total).
        {treeKey === "chief" ? ` Bonuses apply while she is Chief of Staff.` : ""}
        {treeKey === "teamLead"
          ? ` Bonuses apply while she leads a field team.`
          : ""}
        {treeKey === "onSite" ? ` On-site bonuses apply only at ${officeLabel}.` : ""}
      </p>
      <p className="muted secretary-skill-tree-note">{note}</p>
      <div className="secretary-skill-diagram">
        <svg className="secretary-skill-diagram-svg" aria-hidden="true" />
        <div className="secretary-skill-diagram-tiers">
          {tiers.map((tier) => (
            <div
              key={tier.map((n) => n.id).join("-")}
              className={`secretary-skill-tier${
                tier.length > 1 ? " secretary-skill-tier--spread" : ""
              }`}
            >
              {tier.map((node) => (
                <div
                  key={node.id}
                  className="secretary-skill-node-wrap"
                  data-node-id={node.id}
                >
                  <SkillNodeCard
                    treeKey={treeKey}
                    tree={tree}
                    node={node}
                    ranks={ranks}
                    unspent={unspent}
                    officeLabel={officeLabel}
                    onSpend={() => onSpend(node.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SecretarySkillWorkbook({
  state,
  dispatch,
  secretaryId,
  progress,
}: Props) {
  const trees = skillTreesFor(secretaryId);
  const [tab, setTab] = useState<SecretarySkillTreeKey>("chief");
  const officeLabel = officeSiteLabel(
    state,
    secretaryPostedOffice(state, secretaryId),
  );

  const chiefPts = pointsInTree(trees.chief, progress.chiefSkillRanks);
  const leadPts = pointsInTree(trees.teamLead, progress.teamLeadSkillRanks);
  const onSitePts = pointsInTree(trees.onSite, progress.onSiteSkillRanks);

  function spend(tree: SecretarySkillTreeKey, nodeId: string) {
    dispatch({
      type: "SECRETARY_SPEND_SKILL_POINT",
      secretaryId,
      tree,
      nodeId,
    });
  }

  const tabBtn = (
    id: SecretarySkillTreeKey,
    label: string,
    spent: number,
  ) => (
    <button
      type="button"
      className={`secretary-skill-tab${tab === id ? " is-active" : ""}`}
      onClick={() => setTab(id)}
      aria-selected={tab === id}
    >
      {label}
      <span className="secretary-skill-tab-pts"> · {spent} pt</span>
    </button>
  );

  return (
    <div className="secretary-skill-workbook">
      <div className="secretary-skill-tabs" role="tablist">
        {tabBtn("chief", "Chief of Staff", chiefPts)}
        {tabBtn("teamLead", "Team lead", leadPts)}
        {tabBtn("onSite", "On site bonus", onSitePts)}
      </div>
      {tab === "chief" ? (
        <SkillTreeDiagram
          treeKey="chief"
          tree={trees.chief}
          ranks={progress.chiefSkillRanks}
          unspent={progress.unspentSkillPoints}
          officeLabel={officeLabel}
          onSpend={(nodeId) => spend("chief", nodeId)}
        />
      ) : null}
      {tab === "teamLead" ? (
        <SkillTreeDiagram
          treeKey="teamLead"
          tree={trees.teamLead}
          ranks={progress.teamLeadSkillRanks}
          unspent={progress.unspentSkillPoints}
          officeLabel={officeLabel}
          onSpend={(nodeId) => spend("teamLead", nodeId)}
        />
      ) : null}
      {tab === "onSite" ? (
        <SkillTreeDiagram
          treeKey="onSite"
          tree={trees.onSite}
          ranks={progress.onSiteSkillRanks}
          unspent={progress.unspentSkillPoints}
          officeLabel={officeLabel}
          onSpend={(nodeId) => spend("onSite", nodeId)}
        />
      ) : null}
    </div>
  );
}