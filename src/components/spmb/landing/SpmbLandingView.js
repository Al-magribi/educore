"use client";

import { SpmbLandingHero } from "./SpmbLandingHero.js";
import { SpmbGelombangInfo } from "./SpmbGelombangInfo.js";
import { SpmbSchedule } from "./SpmbSchedule.js";
import { SpmbFlowSteps } from "./SpmbFlowSteps.js";
import { SpmbRequirements } from "./SpmbRequirements.js";
import { SpmbFaq } from "./SpmbFaq.js";
import { SpmbContactHelp } from "./SpmbContactHelp.js";

export function SpmbLandingView({ data }) {
  const { page, gelombang, schedule, flow, requirements, fees, faq, contact } = data;
  const sections = page.sections ?? {};

  return (
    <div className="overflow-x-hidden">
      <SpmbLandingHero page={page} />
      {gelombang?.length > 0 ? <SpmbGelombangInfo items={gelombang} /> : null}
      {schedule?.length > 0 ? (
        <SpmbSchedule schedule={schedule} heading={sections.schedule} />
      ) : null}
      {flow?.length > 0 ? <SpmbFlowSteps flow={flow} heading={sections.flow} /> : null}
      {(requirements?.length > 0 || fees) && (
        <SpmbRequirements
          requirements={requirements}
          fees={fees}
          heading={sections.requirements}
        />
      )}
      {faq?.length > 0 ? <SpmbFaq faq={faq} heading={sections.faq} /> : null}
      <SpmbContactHelp contact={contact} />
    </div>
  );
}
