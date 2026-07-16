# summary

Prepare a work item for one-off promotion between pipeline stages.

# description

Prepares a work item for one-off promotion by creating the necessary branches and pull requests in the source control repository. Run this command before running "sf devops work-item promote" for a one-off promotion.

Use "sf devops work-item list" to find the work item ID and target stage ID for a project.

# flags.work-item-id.summary

ID of the work item to prepare for one-off promotion.

# flags.target-stage-id.summary

ID of the pipeline stage to promote the work item to.

# examples

- Prepare a work item for one-off promotion to the UAT stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --work-item-id 0Wx000000000001 --target-stage-id 05S000000000002

- Prepare a work item using a DevOps Center org username:

      <%= config.bin %> <%= command.id %> --target-org devops-center@example.com --work-item-id 0Wx000000000001 --target-stage-id 05S000000000002
