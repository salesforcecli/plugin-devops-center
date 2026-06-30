# summary

Prepare a work item for one-off promotion between pipeline stages.

# description

Prepares a work item for one-off promotion by creating the necessary branches and pull requests in the source control repository. Run this command before running "sf devops work-item promote" for a one-off promotion.

Use "sf devops work-item list" to find the work item ID and pipeline stage IDs for a project.

# flags.work-item-id.summary

ID of the work item to prepare for one-off promotion.

# flags.source-stage-id.summary

ID of the pipeline stage the work item is currently in.

# flags.target-stage-id.summary

ID of the pipeline stage to promote the work item to.

# examples

- Prepare a work item for one-off promotion from the integration stage to the UAT stage:

      <%= config.bin %> <%= command.id %> --devops-center-username my-devops-org --work-item-id 0Wx000000000001 --source-stage-id 05S000000000001 --target-stage-id 05S000000000002

- Prepare a work item using a DevOps Center org username:

      <%= config.bin %> <%= command.id %> --devops-center-username devops-center@example.com --work-item-id 0Wx000000000001 --source-stage-id 05S000000000001 --target-stage-id 05S000000000002
