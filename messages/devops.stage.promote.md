# summary

Promote approved work items to a target pipeline stage.

# description

Promotes all approved work items from the source stage into the target pipeline stage org. Fetches work items from the stage that feeds into the target stage and submits a promotion request via the DevOps Center API.

# flags.target-stage-id.summary

ID of the pipeline stage to promote work items to.

# examples

- Promote all approved work items to a stage with the specific ID:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 05S000000000001

- Promote and deploy all metadata, and run all local tests:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 05S000000000001 --deploy-all --test-level RunLocalTests

# error.NoWorkItems

No work items found to promote from the source stage. Make sure there are approved work items before promoting.

# error.PromoteFailed

Failed to promote stage: %s
