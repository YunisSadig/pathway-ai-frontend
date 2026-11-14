"use client";

import { DashboardView } from "./dashboard-view";
import { PrivatePage } from "./private-page";
import { ProfileForm } from "./profile-form";
import { ProfileView } from "./profile-view";
import { SavedView } from "./saved-view";
import { SettingsView } from "./settings-view";

export function DashboardPageClient() {
  return (
    <PrivatePage
      title="Your dashboard"
      description="Your profile, your saved items and what is available to you."
    >
      {(user) => <DashboardView user={user} />}
    </PrivatePage>
  );
}

export function ProfilePageClient() {
  return (
    <PrivatePage
      title="Your profile"
      description="What you have told us about your studies and plans."
    >
      {() => <ProfileView />}
    </PrivatePage>
  );
}

export function ProfileEditPageClient() {
  return (
    <PrivatePage
      title="Edit your profile"
      description="Everything is optional. Share only what you are comfortable with."
    >
      {() => <ProfileForm />}
    </PrivatePage>
  );
}

export function SavedPageClient() {
  return (
    <PrivatePage
      title="Saved"
      description="Programs and universities you want to come back to."
    >
      {(user) => <SavedView user={user} />}
    </PrivatePage>
  );
}

export function SettingsPageClient() {
  return (
    <PrivatePage
      title="Settings"
      description="Your account, your password and your data."
    >
      {(user) => <SettingsView user={user} />}
    </PrivatePage>
  );
}
