"use client";

import { SpmbLandingHero } from "./SpmbLandingHero.js";
import { SpmbQuickInfo } from "./SpmbQuickInfo.js";
import { SpmbSchedule } from "./SpmbSchedule.js";
import { SpmbFlowSteps } from "./SpmbFlowSteps.js";
import { SpmbRequirements } from "./SpmbRequirements.js";
import { SpmbFaq } from "./SpmbFaq.js";
import { SpmbContactHelp } from "./SpmbContactHelp.js";

export function SpmbLandingView({ data }) {
  const { page, quickInfo, schedule, flow, requirements, fees, faq, contact } = data;

  return (
    <>
      <SpmbLandingHero page={page} />
      <SpmbQuickInfo items={quickInfo} />
      <SpmbSchedule schedule={schedule} />
      <SpmbFlowSteps flow={flow} />
      <SpmbRequirements requirements={requirements} fees={fees} />
      <SpmbFaq faq={faq} />
      <SpmbContactHelp contact={contact} />
    </>
  );
}
