# summary

Validate work item promotion for a pipeline stage.

# description

Validates whether the specified work items can be promoted to the target pipeline stage. Checks for VCS and object permission errors before a promotion is attempted.

# flags.target-stage-id.summary

ID of the target pipeline stage to validate promotion to.

# flags.work-item-id.summary

ID of a work item to validate for promotion. Specify multiple times for multiple work items.

# examples

- Validate promotion of a work item to a target stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 1QV000000000001 --work-item-id 1fk000000000001

- Validate promotion of multiple work items:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 1QV000000000001 --work-item-id 1fk000000000001 --work-item-id 1fk000000000002

# error.NoPipeline

No pipeline found for work item "%s". Ensure the project has an associated pipeline.

# error.ValidationFailed

Validation failed (%s): %s

# error.ValidationRequestFailed

Validation request failed: %s

# suggestion.SharedComponents

The selected work items share one or more components. Choose one of these approaches:

# suggestion.CombineOption

Option 1 - Combine the work items and promote them as a single unit:

# suggestion.PromoteOption

Option 2 - Promote the work items as they are, without combining:

# suggestion.CombineStepPrepare

1. Combine the work items:
   %s

# suggestion.CombineStepPromote

2. Promote the combined work item:
   %s

# suggestion.PromoteStep

Run:
%s
