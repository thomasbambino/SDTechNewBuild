import { formatDistanceToNowStrict, differenceInSeconds } from "date-fns";
import { Activity } from "@/components/dashboard/ActivityFeed";

/**
 * Short, human-readable relative time: "now", "3m", "2h", "5d", "3w".
 * Used by the activity feed to keep lines tight.
 */
export function shortRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const secs = differenceInSeconds(new Date(), date);
  if (secs < 45) return "just now";
  // Strict mode drops the "about" / "less than" and rounds to one unit.
  return formatDistanceToNowStrict(date, { addSuffix: false })
    .replace(" seconds", "s").replace(" second", "s")
    .replace(" minutes", "m").replace(" minute", "m")
    .replace(" hours", "h").replace(" hour", "h")
    .replace(" days", "d").replace(" day", "d")
    .replace(" months", "mo").replace(" month", "mo")
    .replace(" years", "y").replace(" year", "y")
    .replace(" weeks", "w").replace(" week", "w");
}

/** Longer version for the full /admin/activities page. */
export function longRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const secs = differenceInSeconds(new Date(), date);
  if (secs < 45) return "just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/**
 * Turn an activity row into a readable sentence. Returns parts so the
 * caller can style the actor + object (usually bold) differently from the
 * verb and suffix.
 *
 *   {actor} {verb} {object} {suffix}
 *
 * Examples
 *   { actor: "tommyshorez", verb: "signed in" }
 *   { actor: "tommyshorez", verb: "started viewing as", object: "sister.lourde" }
 *   { actor: "tommyshorez", verb: "added client", object: "Acme Corp" }
 *   { verb: "New inquiry from", object: "Jane Doe" }
 */
export interface DescribedActivity {
  actor: string | null;
  verb: string;
  object: string;
  suffix: string;
}

const extractAfterColon = (s: string): string => s.split(":").slice(1).join(":").trim();

const between = (s: string, before: string, after = ""): string => {
  const i = s.indexOf(before);
  if (i === -1) return "";
  const rest = s.slice(i + before.length);
  if (!after) return rest.trim();
  const j = rest.indexOf(after);
  return (j === -1 ? rest : rest.slice(0, j)).trim();
};

export function describeActivity(a: Activity): DescribedActivity {
  const actor = a.userName ?? "Someone";
  const details = a.details ?? "";

  switch (a.action) {
    case "User Login":
      return { actor, verb: "signed in", object: "", suffix: "" };
    case "User Logout":
      return { actor, verb: "signed out", object: "", suffix: "" };
    case "User Registration":
      return { actor, verb: "created an account", object: "", suffix: "" };

    case "Impersonation Started":
      return { actor, verb: "started viewing as", object: between(details, "impersonating "), suffix: "" };
    case "Impersonation Ended":
      return { actor, verb: "stopped viewing as", object: between(details, "impersonating "), suffix: "" };

    case "Client Created":
      return { actor, verb: "added client", object: extractAfterColon(details), suffix: "" };
    case "Client Updated":
      return { actor, verb: "updated client", object: between(details, "Client ", " updated"), suffix: "" };
    case "Client Deleted":
      return { actor, verb: "deleted client", object: extractAfterColon(details), suffix: "" };

    case "Project Created":
      return { actor, verb: "started project", object: extractAfterColon(details), suffix: "" };
    case "Project Updated":
      return { actor, verb: "updated project", object: between(details, "Project ", " updated"), suffix: "" };
    case "Project Deleted":
      return { actor, verb: "deleted project", object: extractAfterColon(details), suffix: "" };

    case "Document Uploaded":
      return { actor, verb: "uploaded", object: extractAfterColon(details) || "a document", suffix: "" };
    case "Document Deleted":
      return { actor, verb: "deleted document", object: extractAfterColon(details), suffix: "" };

    case "Invoice Created":
      return { actor, verb: "created invoice", object: extractAfterColon(details), suffix: "" };
    case "Invoice Updated":
      return { actor, verb: "updated invoice", object: extractAfterColon(details), suffix: "" };

    case "Content Created":
      return { actor, verb: "added website content", object: extractAfterColon(details), suffix: "" };
    case "Content Updated":
      return { actor, verb: "edited website content", object: extractAfterColon(details), suffix: "" };
    case "Content Deleted":
      return { actor, verb: "removed website content", object: extractAfterColon(details), suffix: "" };

    case "Settings Updated":
      return { actor, verb: "updated branding settings", object: "", suffix: "" };
    case "Site Text Updated":
      return { actor, verb: "updated site text", object: "", suffix: "" };
    case "Logo Updated":
      return { actor, verb: "changed the logo", object: "", suffix: "" };
    case "Favicon Updated":
      return { actor, verb: "changed the favicon", object: "", suffix: "" };

    case "Inquiry Submitted":
      return { actor: null, verb: "New inquiry from", object: between(details, "inquiry from "), suffix: "" };
    case "Inquiry Updated":
      return { actor, verb: "set inquiry status to", object: between(details, "status changed to "), suffix: "" };

    case "Team Member Added":
      return { actor, verb: "added a team member", object: "", suffix: "" };
    case "Team Member Removed":
      return { actor, verb: "removed a team member", object: "", suffix: "" };

    case "FreshBooks Connected":
      return { actor, verb: "connected FreshBooks", object: "", suffix: "" };

    case "Password Reset":
      return { actor, verb: "reset a user's password", object: "", suffix: "" };

    default:
      // Unknown action — fall back to a sentence-cased version of the raw
      // action, tacking on the raw details if present.
      return {
        actor,
        verb: a.action.toLowerCase(),
        object: "",
        suffix: details,
      };
  }
}
