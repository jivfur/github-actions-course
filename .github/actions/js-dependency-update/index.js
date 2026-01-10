const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github')

const validateBranchName = ({ branchName }) => /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectoryName = ({ directoryName }) => /^[a-zA-Z0-9_\-\/]+$/.test(directoryName);

async function run() {
    const baseBranch = core.getInput("base-branch");
    const targetBranch = core.getInput("target-branch");
    const ghToken = core.getInput("gh-token");
    const workingDir = core.getInput("working-directory");
    const debug = core.getBooleanInput("debug")

    const commomExecOpts = {
        cwd: workingDir
    }

    core.setSecret(ghToken);
    if (!validateBranchName({ branchName: baseBranch })) {
        core.setFailed('Invalid base branch name.')
        return
    }
    if (!validateBranchName({ branchName: targetBranch })) {
        core.setFailed('Invalid target branch name.')
        return
    }
    if (!validateDirectoryName({ directoryName: workingDir })) {
        core.setFailed('Invalid directory name.')
        return
    }

    core.info('[js-dependency-update]: base branch is ${baseBranch}')
    core.info('[js-dependency-update]: target branch is ${targetBranch}')
    core.info('[js-dependency-update]: working directory is ${workingDir}')

    await exec.exec('npm update', [], {
        ...commomExecOpts
    })

    const gitStatus = await exec.getExecOutput('git status -s package*.json', [], {
        ...commomExecOpts
    })
    if (gitStatus.stdout.length > 0) {
        core.info("[js-dependency-update]: There are updates available.")
        await exec.exec('git config --global user.name gh-automation')
        await exec.exec('git config --global user.email gh-automation@email.com')
        await exec.exec(`git checkout -b ${targetBranch}`, [], {
            ...commomExecOpts
        })
        await exec.exec('git add  package.json package-lock.json', [], {
            ...commomExecOpts
        })
        await exec.exec('git commit -m "chore: Update Dependencies', [], {
            ...commomExecOpts
        })
        await exec.exec(`git push -u origin ${targetBranch} --force`, [], {
            ...commomExecOpts
        })
        const octokit = github.getOctokit(ghToken)
        try {
            await octokit.rest.pulls.create({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                title: 'Update NPM Packages',
                body: 'This PR updates NPM Packages',
                base: baseBranch,
                head: targetBranch

            })
        } catch (e) {
            core.warning('[js-dependency-update] : Something went wrong while creating the PR. Check logs below')
            core.warning(e.message)
            core.warning(e)
        }
    } else {
        core.info("[js-dependency-update]: No updates at this point in time.")
    }

    /*
    1. Parse Inputs:
        1.1 base-branch from which to check for updates
        1.2 target-branch to use to create the PR
        1.3 Github token for auth purposes
        1.4 Working directory for which to check for dependencies
    2. Execute the npm update command within the working directory
    3. Check whether there are modified packages*.json files
    4. If there are modified file:
        4.1 Add and commit files to the target branch
        4.2 Create a PR to the base-branch using the octokit API
    5. Otherwise, conclude the custom action.
    */
    core.info("I am a custom JS action")

}

run()