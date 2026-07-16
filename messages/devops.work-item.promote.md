# summary

Promote one or more work items to a target pipeline stage.

# description

Use this command to move approved work items to the first pipeline stage or to complete a custom promotion after running "sf devops work-item prepare".

# flags.work-item-id.summary

ID of the work item to promote.

# flags.work-item-id.description

Specify this flag multiple times to promote multiple work items in a single operation.

# flags.target-stage-id.summary

ID of the pipeline stage to promote the work items to.

# flags.deploy-all.summary

Deploy all metadata in the source branch rather than only changes not yet in the target stage.

# examples

- Promote a work item to UAT:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 0Wx000000000001 --target-stage-id 05S000000000002

- Promote multiple work items to UAT:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 0Wx000000000001 --work-item-id 0Wx000000000002 --target-stage-id 05S000000000002

# error.PromoteFailed

Failed to promote work items: %s
