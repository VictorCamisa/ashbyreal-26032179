import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle2, Loader2, Lock, Server, Database, FileCheck, Globe, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Stage = 'intro' | 'password' | 'validating' | 'complete';

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'check';
}

const TOTAL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

const validationSteps = [
  { label: 'Inicializando ambiente seguro...', icon: Shield, duration: 3 },
  { label: 'Verificando certificados SSL/TLS...', icon: Lock, duration: 5 },
  { label: 'Conectando ao servidor de autenticação...', icon: Server, duration: 4 },
  { label: 'Validando credenciais SEFAZ...', icon: Globe, duration: 8 },
  { label: 'Testando conexão com banco de dados fiscal...', icon: Database, duration: 6 },
  { label: 'Verificando integridade dos documentos...', icon: FileCheck, duration: 10 },
  { label: 'Executando testes de reconciliação...', icon: Cpu, duration: 12 },
  { label: 'Validando schemas XML (NF-e/NFS-e/NFC-e)...', icon: FileCheck, duration: 15 },
  { label: 'Testando emissão em homologação...', icon: Globe, duration: 20 },
  { label: 'Verificando regras tributárias (ICMS/PIS/COFINS)...', icon: Cpu, duration: 18 },
  { label: 'Sincronizando tabelas NCM/CFOP...', icon: Database, duration: 25 },
  { label: 'Validando integração com gateway de pagamento...', icon: Server, duration: 15 },
  { label: 'Executando stress test na API fiscal...', icon: Cpu, duration: 30 },
  { label: 'Verificando compliance LGPD...', icon: Shield, duration: 12 },
  { label: 'Testando fallback e redundância...', icon: Server, duration: 20 },
  { label: 'Validando endpoints de contingência...', icon: Globe, duration: 25 },
  { label: 'Auditoria de segurança em andamento...', icon: Lock, duration: 35 },
  { label: 'Checando consistência do plano de contas...', icon: Database, duration: 20 },
  { label: 'Validando cálculos de impostos retidos...', icon: Cpu, duration: 30 },
  { label: 'Finalizando bateria de testes...', icon: CheckCircle2, duration: 15 },
];

export function ValidacaoAPIDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stepProgress, setStepProgress] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const remainingTime = TOTAL_DURATION_MS - elapsed;
  const globalProgress = Math.min((elapsed / TOTAL_DURATION_MS) * 100, 100);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs(prev => [...prev, { time, message, type }]);
  }, []);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Main timer
  useEffect(() => {
    if (stage !== 'validating') return;

    startTimeRef.current = Date.now() - elapsed;
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      setElapsed(now - startTimeRef.current);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stage]);

  // Step progression - cycles through steps slowly to fill 2 hours
  useEffect(() => {
    if (stage !== 'validating') return;

    const totalStepDurations = validationSteps.reduce((acc, s) => acc + s.duration, 0);
    const scale = TOTAL_DURATION_MS / 1000 / totalStepDurations; // how much to stretch

    let cumulativeTime = 0;
    for (let i = 0; i < validationSteps.length; i++) {
      const stepDuration = validationSteps[i].duration * scale * 1000;
      if (elapsed < cumulativeTime + stepDuration) {
        if (currentStepIndex !== i) {
          setCurrentStepIndex(i);
          addLog(validationSteps[i].label, 'info');
          if (i > 0) {
            addLog(`✓ ${validationSteps[i - 1].label.replace('...', '')} — OK`, 'success');
          }
        }
        const withinStep = elapsed - cumulativeTime;
        setStepProgress(Math.min((withinStep / stepDuration) * 100, 100));
        break;
      }
      cumulativeTime += stepDuration;
    }
  }, [elapsed, stage, currentStepIndex, addLog]);

  // Initial logs when validation starts
  useEffect(() => {
    if (stage === 'validating' && logs.length === 0) {
      addLog('Sessão de validação iniciada', 'info');
      addLog(`ID da sessão: ${crypto.randomUUID().slice(0, 8).toUpperCase()}`, 'info');
      addLog(`Duração estimada: 02:00:00`, 'warning');
      addLog('─'.repeat(40), 'info');
      addLog(validationSteps[0].label, 'info');
    }
  }, [stage, logs.length, addLog]);

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      setPasswordError('Senha obrigatória');
      return;
    }
    setPasswordError('');
    setStage('validating');
  };

  const handleClose = () => {
    if (stage === 'validating') {
      if (!confirm('A validação está em andamento. Cancelar pode comprometer a integridade do processo. Deseja realmente sair?')) return;
    }
    setStage('intro');
    setPassword('');
    setPasswordError('');
    setElapsed(0);
    setCurrentStepIndex(0);
    setLogs([]);
    setStepProgress(0);
    onOpenChange(false);
  };

  const CurrentIcon = validationSteps[currentStepIndex]?.icon || Shield;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <AnimatePresence mode="wait">
          {/* INTRO STAGE */}
          {stage === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <DialogTitle className="text-xl">Validação de API</DialogTitle>
                </div>
                <DialogDescription className="text-left space-y-3 pt-2">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Este procedimento executa a <strong>ativação final do módulo de contabilidade</strong> e realizará uma bateria completa de testes em todo o sistema integrado.
                  </p>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">⚠ Atenção</p>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li>• Todos os módulos serão verificados durante o processo</li>
                      <li>• A validação completa leva aproximadamente <strong>2 horas</strong></li>
                      <li>• Não feche esta janela durante a execução</li>
                      <li>• O sistema continuará operando normalmente</li>
                      <li>• Certificados digitais e conexões SEFAZ serão testados</li>
                    </ul>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ao prosseguir, você confirma que tem autorização administrativa para executar este procedimento.
                  </p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={() => setStage('password')} className="gap-2">
                  <Shield className="h-4 w-4" />
                  Prosseguir
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* PASSWORD STAGE */}
          {stage === 'password' && (
            <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Lock className="h-6 w-6" />
                  </div>
                  <DialogTitle className="text-xl">Autenticação Necessária</DialogTitle>
                </div>
                <DialogDescription className="text-left pt-2">
                  Informe a senha de administrador para iniciar a validação do sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-pass">Senha de Administrador</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    autoFocus
                  />
                  {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStage('intro')}>Voltar</Button>
                <Button onClick={handlePasswordSubmit} className="gap-2">
                  <Shield className="h-4 w-4" />
                  Iniciar Validação
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* VALIDATING STAGE */}
          {stage === 'validating' && (
            <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 animate-pulse">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg">Validação em Andamento</DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Não feche esta janela</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-foreground tabular-nums">{formatTime(remainingTime > 0 ? remainingTime : 0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tempo restante</p>
                  </div>
                </div>
              </DialogHeader>

              {/* Global progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso geral</span>
                  <span>{globalProgress.toFixed(1)}%</span>
                </div>
                <Progress value={globalProgress} className="h-2" />
              </div>

              {/* Current step */}
              <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-3">
                <CurrentIcon className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{validationSteps[currentStepIndex]?.label}</p>
                  <div className="mt-1.5">
                    <Progress value={stepProgress} className="h-1" />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{currentStepIndex + 1}/{validationSteps.length}</span>
              </div>

              {/* Console log */}
              <div className="bg-zinc-950 rounded-lg p-3 h-[200px] overflow-y-auto font-mono text-[11px] space-y-0.5 border border-zinc-800">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-zinc-500 shrink-0">[{log.time}]</span>
                    <span className={
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'warning' ? 'text-amber-400' :
                      log.type === 'check' ? 'text-blue-400' :
                      'text-zinc-300'
                    }>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Sistema operacional</span>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={handleClose}>
                  Cancelar validação
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
