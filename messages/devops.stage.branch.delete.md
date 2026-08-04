# summary

Delete the source code repository branch associated with a pipeline stage.

# description

Removes the branch linked to the specified pipeline stage. Because branches are configured from right to left (a stage can have a branch only after the stage to its right does), removing a branch also removes the branches from all upstream stages (to the left) in the pipeline, keeping it in a valid state. The branch records in the repository are not deleted; only their association with the stages is removed. The stage must belong to an inactive pipeline.

# flags.pipeline-id.summary

ID of the pipeline that contains the stage. Used to verify the pipeline is inactive before deleting.

# flags.stage-id.summary

ID of the pipeline stage whose branch you want to delete.

# examples

- Delete the branch associated with a pipeline stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000001

# error.PipelineAlreadyActive

Pipeline %s is already active. A branch can only be removed from a stage in an inactive pipeline.

# error.StageNotFound

Pipeline stage "%s" doesn't exist in pipeline "%s". Check the stage ID and try again.

# error.NoBranch

Pipeline stage "%s" doesn't have a branch associated with it. There's nothing to delete.

# error.BranchDeleteFailed

Failed to delete branch from stage: %s
