# summary

Promote one or more work items to a target pipeline stage.

# description

Promotes one or more work items to the specified target pipeline stage. Use this command to move work items from the development or "Approved Work Items" stage into the first pipeline stage, or to complete a one-off promotion after running "sf devops work-item prepare".

Use "sf devops work-item list" to find work item IDs and stage IDs for a project.

# flags.work-item-id.summary

ID of the work item to promote. Specify multiple times to promote more than one work item in a single operation.

# flags.target-stage-id.summary

ID of the pipeline stage to promote the work items to.

# examples

- Promote a single work item to the UAT stage.

      <%= config.bin %> <%= command.id %> --devops-center-username my-devops-org --devops-center-project-name "MyApp Release" --work-item-id 0Wx000000000001 --target-stage-id 05S000000000002

- Promote multiple work items to the same target stage.

      <%= config.bin %> <%= command.id %> --devops-center-username my-devops-org --devops-center-project-name "MyApp Release" --work-item-id 0Wx000000000001 --work-item-id 0Wx000000000002 --target-stage-id 05S000000000002

# error.PromoteFailed

Failed to promote work items: %s
