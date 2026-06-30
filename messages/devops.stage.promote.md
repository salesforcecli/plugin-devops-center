# summary

Promote a bundle from one pipeline stage to the next.

# description

Promotes a bundle from one pipeline stage to the next stage in the pipeline. Changes in the source stage's branch must be merged in the source control repository before running this command.

Specify --bundle-version-name when promoting to the environment that corresponds to the first stage after the bundling stage.

# examples

- Promote a bundle to the staging stage.

      <%= config.bin %> <%= command.id %> --devops-center-username my-devops-org --devops-center-project-name "MyApp Release" --branch-name staging

- Promote a bundle into the first stage after the bundling stage, specifying the bundle version.

      <%= config.bin %> <%= command.id %> --devops-center-username my-devops-org --devops-center-project-name "MyApp Release" --branch-name staging --bundle-version-name 1.0

- Promote a bundle and deploy all metadata, running all local tests.

      <%= config.bin %> <%= command.id %> --devops-center-username my-devops-org --devops-center-project-name "MyApp Release" --branch-name main --deploy-all --test-level RunLocalTests

# error.NoWorkItems

No work items found to promote from the source stage. Ensure there are approved work items before promoting.

# error.PromoteFailed

Failed to promote stage: %s
