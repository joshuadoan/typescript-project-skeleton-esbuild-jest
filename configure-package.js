/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * configures a package created from the template.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const util = require('util');
const cp = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = util.promisify(rl.question).bind(rl);

const basePath = __dirname;

const packageInfo = {
    name: '',
    description: '',
    vendor: {
        name: '',
    },
    author: {
        name: '',
        email: '',
        github: '',
    },
};

const runCommand = str => {
    cp.execSync(str, { cwd: __dirname, encoding: 'utf-8', stdio: 'inherit' });
};

const installDependencies = () => {
    cp.execSync('npm install', { cwd: __dirname, encoding: 'utf-8', stdio: 'inherit' });
};

const askQuestion = async prompt => {
    let result = '';

    try {
        result = await question(`${prompt} `);
    } catch (err) {
        result = false;
    }

    return new Promise(resolve => {
        resolve(result);
    });
};

function is_dir(path) {
    try {
        const stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}

const replaceVariablesInFile = (filename, packageInfo) => {
    let content = fs.readFileSync(filename, { encoding: 'utf-8' }).toString();
    const originalContent = content.slice();

    content = content
        .replace(/package-skeleton/g, packageInfo.name)
        .replace(/\{\{vendor\.name\}\}/g, packageInfo.vendor.name)
        .replace(/\{\{package\.name\}\}/g, packageInfo.name)
        .replace(/\{\{package\.description\}\}/g, packageInfo.description)
        .replace(/\{\{package\.author\.name\}\}/g, packageInfo.author.name)
        .replace(/\{\{package\.author\.email\}\}/g, packageInfo.author.email)
        .replace(/\{\{package\.author\.github\}\}/g, packageInfo.author.github)
        .replace(/\{\{date\.year\}\}/g, new Date().getFullYear())
        .replace('Template Setup: run `node configure-package.js` to configure.\n', '');

    if (originalContent != content) {
        fs.writeFileSync(filename, content, { encoding: 'utf-8' });
    }
};

const processFiles = (directory, packageInfo) => {
    const files = fs.readdirSync(directory).filter(f => {
        return ![
            '.',
            '..',
            '.git',
            '.github',
            '.editorconfig',
            '.gitattributes',
            '.gitignore',
            '.prettierignore',
            '.prettierrc',
            'package-lock.json',
            'node_modules',
            'configure-package.js',
        ].includes(path.basename(f));
    });

    files.forEach(fn => {
        const fqName = `${directory}/${fn}`;
        const relativeName = fqName.replace(basePath + '/', '');
        const isPath = is_dir(fqName);
        const kind = isPath ? 'directory' : 'file';

        console.log(`processing ${kind} ./${relativeName}`);

        if (isPath) {
            processFiles(fqName, packageInfo);
            return;
        }

        replaceVariablesInFile(fqName, packageInfo);
    });
};

const conditionalAsk = async (obj, propName, onlyEmpty, prompt, allowEmpty = false) => {
    const value = obj[propName];

    if (!onlyEmpty || !value.length) {
        while (obj[propName].length === 0) {
            obj[propName] = await askQuestion(prompt);

            if (allowEmpty && obj[propName].length === 0) {
                break;
            }
        }
    }

    return new Promise(resolve => resolve());
};

const populatePackageInfo = async (onlyEmpty = false) => {
    await conditionalAsk(packageInfo, 'name', onlyEmpty, 'package name?');
    await conditionalAsk(packageInfo, 'description', onlyEmpty, 'package description?');
    await conditionalAsk(packageInfo.author, 'name', onlyEmpty, 'author name?');
    await conditionalAsk(packageInfo.author, 'email', onlyEmpty, 'author email?');
    await conditionalAsk(packageInfo.author, 'github', onlyEmpty, 'author github username?');
    await conditionalAsk(packageInfo.vendor, 'name', onlyEmpty, 'vendor name (default is author github name)?', true);

    if (packageInfo.vendor.name.length === 0) {
        packageInfo.vendor.name = packageInfo.author.github;
    }
};

const processUseCodecovService = useService => {
    if (useService) {
        return true;
    }

    const testsWorkflowFn = `${__dirname}/.github/workflows/run-tests.yml`;
    const contents = fs.readFileSync(testsWorkflowFn, { encoding: 'utf-8' });

    fs.writeFileSync(testsWorkflowFn, contents.replace('USE_CODECOV_SERVICE: yes', 'USE_CODECOV_SERVICE: no'), { encoding: 'utf-8' });

    fs.unlinkSync(`${__dirname}/.github/codecov.yml`);
};

const processUseDependabotAutomerge = useAutomerge => {
    if (useAutomerge) {
        return true;
    }

    fs.unlinkSync(`${__dirname}/.github/workflows/dependabot-auto-merge.yml`);
};

const processUseCodeQLAnalysis = useService => {
    if (useService) {
        return true;
    }

    fs.unlinkSync(`${__dirname}/.github/workflows/codeql-analysis.yml`);
};

const askBooleanQuestion = async str => {
    const result = (await askQuestion('Process files (this will change content of some files!)? '))
        .toString()
        .toLowerCase()
        .replace(/ /g, '')
        .replace(/[^yesno]/g, '')
        .slice(0, 1);

    return result === 'y';
};

const run = async function () {
    await populatePackageInfo();

    const useCodecovService = await askBooleanQuestion('Use the Codecov service for code coverage reporting?');
    processUseCodecovService(useCodecovService);

    const useDependabotAutomerge = await askBooleanQuestion('Enable auto-merging of Dependabot PRs for minor/patch version updates?');
    processUseDependabotAutomerge(useDependabotAutomerge);

    const useCodeQLAnalysis = await askBooleanQuestion('Use the GitHub CodeQL analysis service?');
    processUseCodeQLAnalysis(useCodeQLAnalysis);

    const confirm = (await askQuestion('Process files (this will change content of some files!)? '))
        .toString()
        .toLowerCase()
        .replace(/ /g, '')
        .replace(/[^yesno]/g, '')
        .slice(0, 1);

    if (confirm !== 'y') {
        console.log('Not processing files: action canceled.  Exiting.');
        rl.close();
        return;
    }

    processFiles(__dirname, packageInfo);
    rl.close();

    installDependencies();

    console.log('Done, removing this script.');
    fs.unlinkSync(__filename);

    runCommand('git add .');
    runCommand('git commit -m"commit configured package files"');
};

run();
