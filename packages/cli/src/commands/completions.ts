import type { Command } from 'commander';
import { CkError } from '../errors.js';

const BASH = `# contextkit (ck) bash completion
# install: ck completions bash >> ~/.bash_completion
_ck_complete() {
  local cur prev words cword
  _init_completion || return
  local commands="init add list ls get edit rm copy inject template version pull push login logout token telemetry completions"
  local flags="-v --version -h --help"
  if [[ $cword -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands $flags" -- "$cur") )
    return
  fi
  case "$prev" in
    completions) COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") ); return ;;
    token)       COMPREPLY=( $(compgen -W "print set"     -- "$cur") ); return ;;
    telemetry)   COMPREPLY=( $(compgen -W "on off status" -- "$cur") ); return ;;
  esac
  COMPREPLY=( $(compgen -W "$flags" -- "$cur") )
}
complete -F _ck_complete ck contextkit
`;

const ZSH = `#compdef ck contextkit
# contextkit (ck) zsh completion
# install: ck completions zsh > "\${fpath[1]}/_ck"
_ck() {
  local -a commands subs
  commands=(
    'init:create ~/.contextkit/ and config.json'
    'add:create a new context'
    'list:list all saved contexts'
    'ls:alias for list'
    'get:print a context'
    'edit:open a context in $EDITOR'
    'rm:delete a context'
    'copy:copy a context to clipboard'
    'inject:format for a target tool'
    'template:work with bundled templates'
    'version:print version'
    'pull:pull contexts from the cloud'
    'push:push contexts to the cloud'
    'login:authenticate with contextkit.app'
    'logout:remove saved auth token'
    'token:print or set the auth token'
    'telemetry:toggle telemetry (on|off|status)'
    'completions:print shell completion script'
  )
  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi
  case "\${words[2]}" in
    completions) subs=(bash zsh fish); _describe 'shell' subs ;;
    token)       subs=(print set);     _describe 'subcommand' subs ;;
    telemetry)   subs=(on off status); _describe 'subcommand' subs ;;
  esac
}
compdef _ck ck contextkit
`;

const FISH = `# contextkit (ck) fish completion
# install: ck completions fish > ~/.config/fish/completions/ck.fish
complete -c ck -f
complete -c contextkit -f
for sub in init add list ls get edit rm copy inject template version pull push login logout token telemetry completions
  complete -c ck         -n "__fish_use_subcommand" -a $sub
  complete -c contextkit -n "__fish_use_subcommand" -a $sub
end
complete -c ck         -n "__fish_seen_subcommand_from completions" -a "bash zsh fish"
complete -c contextkit -n "__fish_seen_subcommand_from completions" -a "bash zsh fish"
complete -c ck         -n "__fish_seen_subcommand_from token"       -a "print set"
complete -c contextkit -n "__fish_seen_subcommand_from token"       -a "print set"
complete -c ck         -n "__fish_seen_subcommand_from telemetry"   -a "on off status"
complete -c contextkit -n "__fish_seen_subcommand_from telemetry"   -a "on off status"
complete -c ck         -s v -l version -d 'print version'
complete -c ck         -s h -l help    -d 'show help'
`;

/** Return the static completion script for the given shell. */
export function completionScript(shell: 'bash' | 'zsh' | 'fish'): string {
  switch (shell) {
    case 'bash':
      return BASH;
    case 'zsh':
      return ZSH;
    case 'fish':
      return FISH;
  }
}

/** Register `ck completions <shell>` on the program. */
export function register(program: Command): void {
  program
    .command('completions <shell>')
    .description('print a shell completion script (bash|zsh|fish)')
    .addHelpText(
      'after',
      `\nInstall examples:\n  ck completions bash >> ~/.bash_completion\n  ck completions zsh  > "\${fpath[1]}/_ck"\n  ck completions fish > ~/.config/fish/completions/ck.fish\n`,
    )
    .action((shell: string) => {
      if (shell !== 'bash' && shell !== 'zsh' && shell !== 'fish') {
        throw new CkError('EUSER', `unsupported shell "${shell}" (try bash|zsh|fish)`);
      }
      process.stdout.write(completionScript(shell));
    });
}
