# summary

Update a DevOps Center pipeline stage.

# description

Updates the name of a pipeline stage.

# flags.stage-id.summary

ID of the pipeline stage to update.

# flags.name.summary

New name for the pipeline stage.

# examples

- Rename a pipeline stage.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --stage-id 1QV000000000001 --name "Integration"

# error.StageNotFound

Stage "%s" not found. Check the stage ID and try again.
