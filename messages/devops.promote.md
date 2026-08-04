# summary

Promote work items or a pipeline stage to a target pipeline stage.

# description

Promote specific work items or all approved work items from a source stage to the target pipeline stage.

Pass --work-item-id to promote one or more specific work items to the target stage.

Pass --stage-id to promote all approved work items from that source stage to the target stage.

Exactly one of --work-item-id or --stage-id must be provided.

Use --deploy-all to deploy all metadata in the branch rather than only changes not yet in the target stage.

# flags.target-stage-id.summary

ID of the pipeline stage to promote to.

# flags.work-item-id.summary

ID of the work item to promote. Mutually exclusive with --stage-id.

# flags.work-item-id.description

Specify this flag multiple times to promote multiple work items in a single operation.

# flags.stage-id.summary

ID of the source pipeline stage whose approved work items will be promoted. Mutually exclusive with --work-item-id.

# examples

- Promote all approved work items from a source stage to a target stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --stage-id 1QVxx0000000001 --target-stage-id 1QVxx0000000002

- Promote a specific work item to a stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 1fkxx0000000001 --target-stage-id 1QVxx0000000001

- Promote multiple work items:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 1fkxx0000000001 --work-item-id 1fkxx0000000002 --target-stage-id 1QVxx0000000001

- Promote a stage with full deploy:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --stage-id 1QVxx0000000001 --target-stage-id 1QVxx0000000002 --deploy-all

# flags.skip-validation.summary

Skip pre-promote validation. By default, promotion is validated before proceeding to prevent promoting work items without an associated PR. Use this flag to bypass validation.

# error.NoModeFlag

Provide either --work-item-id to promote specific work items or --stage-id to promote all approved work items from a stage.

# error.NoWorkItems

No work items found to promote from the source stage. Make sure there are approved work items before promoting.

# error.ValidationRequestFailed

Failed to run pre-promote validation: %s

# error.ValidationFailedCombineRequired

Promotion blocked: work items must be combined before promoting. Run the combine command with the following details:

# error.ValidationFailed

Pre-promote validation failed (%s): %s

# error.PromoteFailed

Failed to promote: %s
