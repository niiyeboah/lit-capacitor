/* eslint-disable */

/**
 * This script runs automatically after your first npm-install.
 */
const _prompt = require('prompt');
const { mv, rm, which, exec } = require('shelljs');
const replace = require('replace-in-file');
const colors = require('colors');
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');

const errorMessage = 'There was an error building the workspace.';

// Note: These should all be relative to the project root directory
const rmDirs = ['.git', '.vscode'];
const rmFiles = ['util/', 'util/init.js'];
const modifyFiles = ['index.html', 'LICENSE', 'README.md', 'capacitor.config.json', 'src/lit-capacitor.ts'];
const renameFiles = ['src/lit-capacitor.ts'];

const _promptSchemaElementName = {
  properties: {
    appName: {
      description: colors.cyan('What do you want the app to be called?'),
      pattern: /.*/,
      type: 'string',
      required: true
    }
  }
};

const _promptSchemaElementDescription = {
  properties: {
    description: {
      description: colors.cyan('Please provide a description of the app'),
      pattern: /.*/,
      type: 'string'
    }
  }
};

const _promptSchemaElementSuggest = {
  properties: {
    useSuggestedName: {
      description: colors.cyan('Would you like the app to be called "' + elementNameSuggested() + '"? [Yes/No]'),
      pattern: /^(y(es)?|n(o)?)$/i,
      type: 'string',
      required: true,
      message: 'You need to type "Yes" or "No" to continue...'
    }
  }
};

const _promptSchemaRemoveGit = {
  properties: {
    removegit: {
      description: colors.cyan('Would you like to clear the git history? [Yes/No]'),
      pattern: /^(y(es)?|n(o)?)$/i,
      type: 'string',
      required: true,
      message: 'You need to type "Yes" or "No" to continue...'
    }
  }
};

_prompt.start();
_prompt.message = '';

// Clear console
process.stdout.write('\x1B[2J\x1B[0f');

if (!which('git')) {
  console.log(colors.red('Sorry, this script requires git'));
  removeItems();
  process.exit(1);
}

// Generate the element name and start the tasks
if (process.env.CI == null) {
  if (!elementNameSuggestedIsDefault()) {
    elementNameSuggestedAccept();
  } else {
    elementNameCreate();
  }
} else {
  // This is being run in a CI environment, so don't ask any questions
  setupElement(elementNameSuggested(), '');
}

/**
 * Asks the user for the name of the element if it has been cloned into the
 * default directory, or if they want a different name to the one suggested
 */
function elementNameCreate() {
  _prompt.get(_promptSchemaElementName, (err, res) => {
    if (err) {
      console.log(colors.red(errorMessage));
      process.exit(1);
      return;
    }

    elementDescriptionCreate(
      res.appName
        .replace(/[^a-zA-Z0-9- ]/g, '')
        .replace(/ /g, '-')
        .toLowerCase()
    );
  });
}

/**
 * Asks the user for a decription of the element to be used in package.json and summary for jsdocs
 */
function elementDescriptionCreate(elementname) {
  _prompt.get(_promptSchemaElementDescription, (err, res) => {
    if (err) {
      console.log(colors.red(errorMessage));
      process.exit(1);
      return;
    }

    removeGitChoice(elementname, res.description);
  });
}

/**
 * Asks the user whether they would like to reset git history
 */
function removeGitChoice(elementname, elementdescription) {
  _prompt.get(_promptSchemaRemoveGit, (err, res) => {
    if (err) {
      console.log(colors.red(errorMessage));
      process.exit(1);
      return;
    }

    setupElement(elementname, elementdescription, res.removegit.toLowerCase().charAt(0) === 'y');
  });
}

/**
 * Sees if the users wants to accept the suggested element name if the project
 * has been cloned into a custom directory (i.e. it's not 'lit-capacitor')
 */
function elementNameSuggestedAccept() {
  _prompt.get(_promptSchemaElementSuggest, (err, res) => {
    if (err) {
      console.log(colors.red("Sorry, you'll need to type the app name"));
      elementNameCreate();
    }

    if (res.useSuggestedName.toLowerCase().charAt(0) === 'y') {
      elementDescriptionCreate(elementNameSuggested());
    } else {
      elementNameCreate();
    }
  });
}

/**
 * The element name is suggested by looking at the directory name of the
 * tools parent directory and converting it to kebab-case
 *
 * The regex for this looks for any non-word or non-digit character, or
 * an underscore (as it's a word character), and replaces it with a dash.
 * Any leading or trailing dashes are then removed, before the string is
 * lowercased and returned
 */
function elementNameSuggested() {
  return path
    .basename(path.resolve(__dirname, '..'))
    .replace(/[^\w\d]|_/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Checks if the suggested element name is the default, which is 'lit-capacitor'
 */
function elementNameSuggestedIsDefault() {
  if (elementNameSuggested() === 'lit-capacitor') {
    return true;
  }

  return false;
}

/**
 * Calls all of the functions needed to setup the element
 *
 * @param elementname
 */
function setupElement(elementname, elementdescription, removegit) {
  console.log('\n');

  // Get the Git username and email before the .git directory is removed
  let username = exec('git config user.name').stdout.trim();
  let usermail = exec('git config user.email').stdout.trim();

  removeItems(removegit);

  modifyContents(elementname, elementdescription, username, usermail);

  renameItems(elementname);

  finalize(removegit);

  console.log('\n');
}

/**
 * Removes items from the project that aren't needed after the initial setup
 */
function removeItems(removegit) {
  console.log(colors.underline.white('Removed'));

  // The directories and files are combined here, to simplify the function,
  // as the 'rm' command checks the item type before attempting to remove it
  let rmItems = rmFiles;
  if (removegit) {
    rmItems = rmDirs.concat(rmFiles);
  }
  rm(
    '-rf',
    rmItems.map(f => path.resolve(__dirname, '..', f))
  );
  console.log(colors.red(rmItems.join('\n')));

  console.log('\n');
}

/**
 * Updates the contents of the template files with the element name or user details
 *
 * @param elementname
 * @param elementdescription
 * @param username
 * @param usermail
 */
function modifyContents(elementname, elementdescription, username, usermail) {
  console.log(colors.underline.white('Modified'));

  const elementclassname = elementname
    .split('-')
    .map(c => c[0].toUpperCase() + c.slice(1))
    .join('');

  const files = modifyFiles.map(f => path.resolve(__dirname, '..', f));
  try {
    replace.sync({
      files,
      from: [/lit-capacitor/g, /LitCapacitor/g, /--description--/g, /--username--/g, /--usermail--/g, /\*\*Run.*\*\*/],
      to: [elementname, elementclassname, elementdescription, username, usermail, '']
    });
    console.log(colors.yellow(modifyFiles.join('\n')));
  } catch (error) {
    console.error('An error occurred modifying the file: ', error);
  }

  console.log('\n');
}

/**
 * Renames any template files to the new element name
 *
 * @param elementname
 */
function renameItems(elementname) {
  console.log(colors.underline.white('Renamed'));

  renameFiles.forEach(file => {
    const newFilename = file.replace(/lit-capacitor/g, elementname);
    mv(path.resolve(__dirname, '..', file), path.resolve(__dirname, '..', newFilename));
    console.log(colors.cyan(file + ' => ' + newFilename));
  });

  console.log('\n');
}

/**
 * Calls any external programs to finish setting up the element.
 */
function finalize(removegit) {
  console.log(colors.underline.white('Finalizing'));

  // Recreate Git folder
  if (removegit) {
    let gitInitOutput = exec('git init "' + path.resolve(__dirname, '..') + '"', { silent: true }).stdout;
    console.log(colors.green(gitInitOutput.replace(/(\n|\r)+/g, '')));
  }

  // Remove post-install command
  let jsonPackage = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(jsonPackage));
  delete pkg.scripts.postinstall;
  writeFileSync(jsonPackage, JSON.stringify(pkg, null, 2));

  console.log('\n');
}
