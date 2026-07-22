# summary

Promote work items or a full stage to a target pipeline stage.

# description

Promote specific work items or all approved work items from a stage to the target pipeline stage.

Pass --work-item-id to promote one or more specific work items. Omit it to promote all approved work items from the stage that feeds into the target stage.

Use --deploy-all to deploy all metadata in the branch rather than only changes not yet in the target stage.

# flags.target-stage-id.summary

ID of the pipeline stage to promote to.

# flags.work-item-id.summary

ID of the work item to promote. Omit to promote all approved work items from the source stage.

# flags.work-item-id.description

Specify this flag multiple times to promote multiple work items in a single operation.

# examples

- Promote all approved work items from the source stage to a target stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 1QVxx0000000001

- Promote a specific work item:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 1fkxx0000000001 --target-stage-id 1QVxx0000000001

- Promote multiple work items:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 1fkxx0000000001 --work-item-id 1fkxx0000000002 --target-stage-id 1QVxx0000000001

- Promote and deploy all metadata:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 1QVxx0000000001 --deploy-all

# error.NoWorkItems

No work items found to promote from the source stage. Make sure there are approved work items before promoting.

# error.PromoteFailed

Failed to promote: %s
