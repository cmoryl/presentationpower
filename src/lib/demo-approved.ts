// ---------------------------------------------------------------------------
// Approved demos.
//
// Showcase demos are finished, reviewed, 100% approved pieces. When a visitor
// generates an editable copy of one, it must open clean: no QA issue lists, no
// blocking export gates, no layout-health or overflow warnings. Those gates
// exist to protect authored-from-scratch work, not to second-guess a piece we
// shipped as a reference example.
//
// The flag is stamped on the generated copy's context, so it travels with the
// deck / print asset and survives edits, exports and division retargets.
// ---------------------------------------------------------------------------

type MaybeContext = { demoApproved?: boolean | null } | null | undefined;

/** True when this deck / print asset came from an approved showcase demo. */
export function isApprovedDemo(context: MaybeContext): boolean {
  return !!context?.demoApproved;
}

/**
 * Drop every QA finding for approved demos. Used at each QA read site so the
 * editor, export screen and print editor all agree.
 */
export function gateQaIssues<T>(issues: T[], context: MaybeContext): T[] {
  return isApprovedDemo(context) ? [] : issues;
}
