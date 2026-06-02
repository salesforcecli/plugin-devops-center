# summary

List all DevOps Center projects in a Salesforce org.

# description

This command queries the DevopsProject standard object and returns the project Id, Name, and Description for each project found.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# examples

- List all DevOps Center projects in an org with alias "my-devops-org":

      <%= config.bin %> <%= command.id %> --target-org my-devops-org

- List projects using an org's username:

      <%= config.bin %> <%= command.id %> --target-org devops-center@example.com
