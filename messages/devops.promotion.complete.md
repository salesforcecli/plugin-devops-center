# summary

Deploy undeployed work items to a pipeline stage org.

# description

Deploys work items that were merged into the pipeline branch outside of DevOps Center (externally merged) into the target stage org and updates DevOps Center records. Equivalent to the "Complete Promotion" action in the DevOps Center UI when a stage is out of sync.

If no undeployed work items are found for the stage, the command exits successfully with no action taken.

# flags.target-stage-id.summary

ID of the out-of-sync pipeline stage to deploy to.

# flags.work-item-id.summary

ID of a specific work item to deploy. Omit to deploy all undeployed work items for the stage. Use this for the first stage of a pipeline where no source stage exists.

# examples

- Complete a promotion for an out-of-sync pipeline stage.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 1QV000000000001

- Complete a promotion for a specific work item (e.g. first stage of a pipeline).

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 1QV000000000001 --work-item-id 1fk000000000001

- Complete a promotion with full deploy and a specific test level.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --target-stage-id 1QV000000000001 --deploy-all --test-level RunLocalTests

# info.NothingToDeploy

No undeployed work items found for this stage.

# error.StageNotFound

Stage '%s' not found or has no associated pipeline.

# error.ValidationFailed

Pre-flight validation failed. Error type: %s. Details: %s

# error.DeployFailed

Deploy request failed: %s
