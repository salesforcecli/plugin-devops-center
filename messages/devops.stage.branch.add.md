# summary

Add a source code repository branch to a pipeline stage.

# description

By default, the branch must exist in the repository. Use --create-vcs-branch to create a branch if it doesn't exist.
Each pipeline stage supports only one branch. If the stage already has a branch, the command blocks so the existing branch isn't orphaned; pass --force to replace it.

# flags.pipeline-id.summary

ID of the pipeline that contains the stage.

# flags.stage-id.summary

ID of the pipeline stage to associate the branch with.

# flags.branch-name.summary

Name of the repository branch to assign to the stage.

# flags.create-vcs-branch.summary

Create the branch in the remote repository if it doesn't already exist.

# flags.force.summary

Replace the stage's existing branch. By default, the command blocks if the stage already has a branch to avoid orphaning it. With this flag, the new branch is associated and the previous branch record is removed if no other stage references it.

# examples

- Add an existing branch to a stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000001 --branch-name main

- Create and add a branch to a pipeline stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000002 --branch-name integration --create-vcs-branch

# error.StageNotFound

Pipeline stage "%s" doesn't exist in pipeline "%s". Check the stage ID and try again.

# error.NextStageNoBranch

You must set up a branch on stage "%s" before configuring stage "%s". Branches must be configured from right to left (starting from the last stage in the pipeline).

# error.BranchAttachFailed

Failed to associate branch with stage: %s

# error.BranchAlreadyExists

Stage "%s" already has a branch ("%s"). Adding another would leave the existing one orphaned. Remove it first with "%s devops stage branch delete", or pass --force to replace it.

# info.ReplacedBranchRemoved

Removed the stage's previous branch "%s".

# warn.ReplacedBranchCleanupFailed

Associated the new branch, but couldn't remove the previous branch record (%s). Remove it manually if it's no longer needed.
