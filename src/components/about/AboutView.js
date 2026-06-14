"use client";

import { AboutPageHero } from "./AboutPageHero.js";
import { SchoolProfile } from "./SchoolProfile.js";
import { VisionMission } from "./VisionMission.js";
export function AboutView({ data }) {
  const { page, profile, vision, mission, values } = data;

  return (
    <>
      <AboutPageHero
        title={page.title}
        subtitle={page.subtitle}
        imageUrl={page.imageUrl}
        imageAlt={page.imageAlt}
      />
      <SchoolProfile
        title={profile.title}
        paragraphs={profile.paragraphs}
        highlights={profile.highlights}
      />
      <VisionMission vision={vision} mission={mission} values={values} />
    </>
  );
}
