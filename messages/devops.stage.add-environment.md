# summary

Create and associate a Salesforce environment with a pipeline stage.

# description

Creates a new environment and associates it with a pipeline stage. The command triggers an OAuth flow to authenticate the environment — a browser window opens automatically for you to log in. Once authenticated, the command validates the connection and prints the final environment details.

Use --no-browser if you want to authenticate manually by opening the redirect URL yourself.

# flags.pipeline-id.summary

ID of the pipeline that contains the stage.

# flags.stage-id.summary

ID of the pipeline stage to associate the environment with.

# flags.environment-name.summary

Name of the environment to create and associate with the stage.

# flags.org-type.summary

Type of the Salesforce org. Valid values: Production, Sandbox.

# flags.no-browser.summary

Don't auto-open the browser for OAuth authentication. The redirect URL is printed for manual use.

# examples

- Create a production environment and attach it to a stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000001 --environment-name Production_Org --org-type Production

- Create a sandbox environment and attach it to a stage:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000002 --environment-name UAT_Sandbox --org-type Sandbox

- Create an environment without opening the browser:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Xo000000000001 --stage-id 0Xp000000000001 --environment-name Production_Org --org-type Production --no-browser

# info.BrowserOpened

A browser window has been opened for authentication. Log in to the target org to complete the setup.

# info.ManualAuth

Open the following URL in your browser to authenticate the environment:\n%s

# info.WaitingForAuth

Waiting for authentication to complete...

# info.Success

Successfully created and authenticated the environment.

# error.StageNotFound

Pipeline stage "%s" doesn't exist in pipeline "%s". Check the stage ID and try again.

# error.EnvironmentAttachFailed

Failed to create environment for stage: %s

# error.AuthTimeout

Authentication timed out. The environment was created but not yet authenticated. Re-run the command or authenticate manually via the org's DevOps Center setup.
