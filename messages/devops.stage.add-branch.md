# summary

Associate a source code repository branch with a pipeline stage.

# description

Associates a source code repository branch with a pipeline stage. By default, the branch must already exist in the repository linked to the pipeline. Use `--create-vcs-branch` to create a new branch in the remote repository if it doesn't exist. Each stage can have at most one branch; if the stage already has a branch, the command replaces it.

# flags.pipeline-id.summary

ID of the pipeline that contains the stage.

# flags.stage-id.summary

ID of the pipeline stage to associate the branch with.

# flags.branch-name.summary

Name of the repository branch to assign to the stage.

# flags.create-vcs-branch.summary

Create the branch in the remote repository if it doesn't already exist.

# examples

- Attach an existing branch to a stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000001 --branch-name main

- Create a new branch in the remote repository and attach it to a stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000002 --branch-name integration --create-vcs-branch

# error.StageNotFound

Pipeline stage "%s" doesn't exist in pipeline "%s". Check the stage ID and try again.

# error.NextStageNoBranch

You must set up a branch on stage "%s" before configuring stage "%s". Branches must be configured from right to left (starting from the last stage in the pipeline).

# error.BranchAttachFailed

Failed to associate branch with stage: %s
