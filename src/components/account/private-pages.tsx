"use client";

import { DashboardView } from "./dashboard-view";
import { OpenPage, PrivatePage } from "./private-page";
import { ProfileView } from "./profile-view";
import { SavedView } from "./saved-view";
import { SettingsView } from "./settings-view";
import { ProfileWizard } from "@/components/profile/profile-wizard";

export function DashboardPageClient() {
  return (
    <PrivatePage titleKey="dash.title" descriptionKey="dash.description">
      {(user) => <DashboardView user={user} />}
    </PrivatePage>
  );
}

export function ProfilePageClient() {
  return (
    <PrivatePage titleKey="profile.title" descriptionKey="profile.description">
      {() => <ProfileView />}
    </PrivatePage>
  );
}

export function ProfileEditPageClient() {
  return (
    <PrivatePage titleKey="wizard.title" descriptionKey="wizard.description">
      {() => <ProfileWizard />}
    </PrivatePage>
  );
}

export function SavedPageClient() {
  return (
    <PrivatePage titleKey="saved.title" descriptionKey="saved.description">
      {(user) => <SavedView user={user} />}
    </PrivatePage>
  );
}

/** Settings is open to everyone: appearance and language only change this browser. */
export function SettingsPageClient() {
  return (
    <OpenPage titleKey="settings.title" descriptionKey="settings.description">
      <SettingsView />
    </OpenPage>
  );
}
