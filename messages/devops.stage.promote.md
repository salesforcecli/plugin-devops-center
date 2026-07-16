# summary

Promote approved work items to a target pipeline stage.

# description

Promotes all approved work items in a project to the specified target stage. Specify the ID of the target pipeline stage to promote to.

# flags.target-stage-id.summary

ID of the pipeline stage to promote work items to.

# examples

- Promote all approved work items to a stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 05S000000000001

- Promote and deploy all metadata, running all local tests:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 05S000000000001 --deploy-all --test-level RunLocalTests

# error.NoWorkItems

No work items found to promote from the source stage. Ensure there are approved work items before promoting.

# error.PromoteFailed

Failed to promote stage: %s
