---
outline: deep
---

# Checklist: Debug Kubernetes in Production Environment

Debugging Kubernetes in production can be challenging, especially when dealing with distributed systems, multiple layers of abstraction, and time-sensitive issues. This comprehensive checklist provides a systematic approach to diagnose and resolve common Kubernetes production problems.

## Pre-Debugging Preparation

Before diving into debugging, ensure you have the necessary tools and access:

::: tip Essential Tools

- `kubectl` (configured with proper context)
- `kubectx` / `kubens` (for context switching)
- `stern` or `kubectl logs -f` (for log streaming)
- `k9s` (terminal UI for Kubernetes)
- `helm` (if using Helm charts)
- Access to cluster monitoring tools (Prometheus, Grafana)
- Access to cloud provider console (if applicable)
  :::

## Quick Health Check

Start with a high-level overview of your cluster:

```bash
# Check cluster nodes
kubectl get nodes

# Check all pods across all namespaces
kubectl get pods --all-namespaces

# Check resource usage
kubectl top nodes
kubectl top pods --all-namespaces

# Check cluster events
kubectl get events --sort-by='.lastTimestamp' --all-namespaces
```

## Debugging Checklist

### 1. Pod Status Issues

#### 1.1 Pod Not Starting (Pending/ContainerCreating)

```bash
# Check pod status
kubectl get pods -n <namespace>

# Describe pod for detailed information
kubectl describe pod <pod-name> -n <namespace>

# Check pod events
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod-name>
```

**Common Causes:**

- **Image pull errors**: Check image name, tag, and registry access
- **Resource constraints**: Insufficient CPU/memory on nodes
- **Volume mount issues**: PVC not bound, wrong storage class
- **Node selector/affinity**: No matching nodes available

**Quick Fixes:**

```bash
# Check image pull secrets
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.imagePullSecrets}'

# Check resource requests/limits
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Limits\|Requests"

# Check persistent volume claims
kubectl get pvc -n <namespace>
```

#### 1.2 Pod CrashLoopBackOff

```bash
# Get pod logs (current instance)
kubectl logs <pod-name> -n <namespace>

# Get logs from previous crashed container
kubectl logs <pod-name> -n <namespace> --previous

# Get all container logs in pod
kubectl logs <pod-name> -n <namespace> --all-containers=true

# Stream logs in real-time
kubectl logs -f <pod-name> -n <namespace>
```

**Common Causes:**

- Application errors (check logs)
- Missing environment variables
- Incorrect configuration files
- Health check failures
- Out of memory (OOMKilled)

**Debugging Steps:**

```bash
# Check exit code
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'

# Check if OOMKilled
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'

# Check resource limits
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 "Limits"
```

#### 1.3 Pod Running but Not Ready

```bash
# Check readiness probe status
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Readiness"

# Check liveness probe
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Liveness"

# Test endpoint manually
kubectl exec -it <pod-name> -n <namespace> -- curl http://localhost:<port>/health
```

::: warning Probe Configuration
Ensure your readiness and liveness probes are correctly configured:

- Readiness probe should check if app can serve traffic
- Liveness probe should check if app is alive
- Initial delay should account for startup time
  :::

### 2. Service and Networking Issues

#### 2.1 Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints <service-name> -n <namespace>

# Describe service
kubectl describe svc <service-name> -n <namespace>

# Check service selector matches pod labels
kubectl get svc <service-name> -n <namespace> -o jsonpath='{.spec.selector}'
kubectl get pods -n <namespace> --show-labels
```

**Common Issues:**

- Service selector doesn't match pod labels
- No pods ready (readiness probe failing)
- Wrong port configuration
- Network policies blocking traffic

#### 2.2 DNS Resolution Problems

```bash
# Test DNS from within a pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup <service-name>.<namespace>.svc.cluster.local

# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns
```

#### 2.3 Ingress Not Working

```bash
# Check ingress status
kubectl get ingress -n <namespace>

# Describe ingress
kubectl describe ingress <ingress-name> -n <namespace>

# Check ingress controller pods
kubectl get pods -n <ingress-namespace> -l app=<ingress-controller>

# Check ingress controller logs
kubectl logs -n <ingress-namespace> -l app=<ingress-controller>
```

### 3. Resource and Performance Issues

#### 3.1 High CPU/Memory Usage

```bash
# Check resource usage
kubectl top pods -n <namespace>
kubectl top nodes

# Get detailed resource metrics
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 "Limits\|Requests"

# Check if pods are being throttled
kubectl describe pod <pod-name> -n <namespace> | grep -i throttle
```

**Solutions:**

- Adjust resource requests and limits
- Scale horizontally (add more replicas)
- Optimize application code
- Check for memory leaks

#### 3.2 Node Issues

```bash
# Check node status
kubectl get nodes
kubectl describe node <node-name>

# Check node conditions
kubectl get nodes -o wide

# Check node resources
kubectl describe node <node-name> | grep -A 10 "Allocated resources"

# Check for node pressure
kubectl get nodes -o json | jq '.items[].status.conditions'
```

**Common Node Problems:**

- **MemoryPressure**: Node running out of memory
- **DiskPressure**: Node running out of disk space
- **PIDPressure**: Too many processes
- **NetworkUnavailable**: Network issues

### 4. Configuration and Secrets Issues

#### 4.1 ConfigMap/Secret Not Mounted

```bash
# Check if ConfigMap exists
kubectl get configmap -n <namespace>

# Check ConfigMap contents
kubectl get configmap <configmap-name> -n <namespace> -o yaml

# Check if mounted in pod
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Mounts"

# Verify mounted files
kubectl exec <pod-name> -n <namespace> -- ls -la /path/to/mount
kubectl exec <pod-name> -n <namespace> -- cat /path/to/config
```

#### 4.2 Environment Variables Issues

```bash
# Check environment variables in pod
kubectl exec <pod-name> -n <namespace> -- env

# Check env from ConfigMap/Secret
kubectl describe pod <pod-name> -n <namespace> | grep -A 20 "Environment"
```

### 5. Deployment and Rollout Issues

#### 5.1 Deployment Not Updating

```bash
# Check deployment status
kubectl get deployment <deployment-name> -n <namespace>

# Check rollout status
kubectl rollout status deployment/<deployment-name> -n <namespace>

# Check deployment history
kubectl rollout history deployment/<deployment-name> -n <namespace>

# Describe deployment
kubectl describe deployment <deployment-name> -n <namespace>
```

#### 5.2 Rollout Stuck

```bash
# Check replica sets
kubectl get rs -n <namespace>

# Check rollout status
kubectl rollout status deployment/<deployment-name> -n <namespace>

# Check for deployment conditions
kubectl get deployment <deployment-name> -n <namespace> -o jsonpath='{.status.conditions}'
```

**Common Causes:**

- Insufficient resources for new pods
- Image pull errors
- Health check failures
- Quota limits reached

**Rollback if needed:**

```bash
# Rollback to previous revision
kubectl rollout undo deployment/<deployment-name> -n <namespace>

# Rollback to specific revision
kubectl rollout undo deployment/<deployment-name> -n <namespace> --to-revision=2
```

### 6. Storage and Volume Issues

#### 6.1 PVC Not Bound

```bash
# Check PVC status
kubectl get pvc -n <namespace>

# Describe PVC
kubectl describe pvc <pvc-name> -n <namespace>

# Check storage classes
kubectl get storageclass

# Check PV
kubectl get pv
kubectl describe pv <pv-name>
```

**Common Issues:**

- No available storage in storage class
- Storage class doesn't exist
- Insufficient quota
- Node selector mismatch

#### 6.2 Volume Mount Errors

```bash
# Check pod volume mounts
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 "Volumes"

# Check if volume is mounted
kubectl exec <pod-name> -n <namespace> -- df -h
kubectl exec <pod-name> -n <namespace> -- mount | grep <volume-path>
```

### 7. Security and RBAC Issues

#### 7.1 Permission Denied Errors

```bash
# Check service account
kubectl get sa -n <namespace>
kubectl describe sa <service-account-name> -n <namespace>

# Check roles and role bindings
kubectl get roles -n <namespace>
kubectl get rolebindings -n <namespace>

# Check cluster roles
kubectl get clusterroles
kubectl get clusterrolebindings
```

#### 7.2 Network Policy Blocking Traffic

```bash
# Check network policies
kubectl get networkpolicies -n <namespace>
kubectl describe networkpolicy <policy-name> -n <namespace>

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- <service-url>
```

### 8. Logging and Monitoring

#### 8.1 Collecting Comprehensive Logs

```bash
# All pods in namespace
kubectl logs -l app=<app-label> -n <namespace> --all-containers=true

# Previous crashed containers
kubectl logs <pod-name> -n <namespace> --previous --all-containers=true

# Logs with timestamps
kubectl logs <pod-name> -n <namespace> --timestamps

# Logs from specific time
kubectl logs <pod-name> -n <namespace> --since=1h
kubectl logs <pod-name> -n <namespace> --since-time="2024-01-01T00:00:00Z"

# Using stern for multi-pod log streaming
stern <app-label> -n <namespace>
```

#### 8.2 Debugging with Ephemeral Containers

```bash
# Add debug container to running pod (Kubernetes 1.23+)
kubectl debug <pod-name> -n <namespace> -it --image=busybox --target=<container-name>

# Create debug pod with same node
kubectl debug node/<node-name> -it --image=busybox
```

### 9. Advanced Debugging Techniques

#### 9.1 Exec into Containers

```bash
# Exec into pod
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# Exec into specific container
kubectl exec -it <pod-name> -n <namespace> -c <container-name> -- /bin/sh

# Run commands
kubectl exec <pod-name> -n <namespace> -- ps aux
kubectl exec <pod-name> -n <namespace> -- netstat -tulpn
kubectl exec <pod-name> -n <namespace> -- env
```

#### 9.2 Port Forwarding for Local Testing

```bash
# Forward pod port
kubectl port-forward <pod-name> -n <namespace> 8080:80

# Forward service port
kubectl port-forward svc/<service-name> -n <namespace> 8080:80

# Forward deployment
kubectl port-forward deployment/<deployment-name> -n <namespace> 8080:80
```

#### 9.3 API Server Debugging

```bash
# Check API server logs (if you have access)
kubectl logs -n kube-system -l component=kube-apiserver

# Check API server events
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

### 10. Production Debugging Workflow

Follow this systematic workflow when debugging production issues:

```bash
# Step 1: Identify the problem
kubectl get pods -n <namespace>
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Step 2: Get detailed pod information
kubectl describe pod <pod-name> -n <namespace>

# Step 3: Check logs
kubectl logs <pod-name> -n <namespace> --all-containers=true --previous

# Step 4: Check resources
kubectl top pod <pod-name> -n <namespace>
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 "Limits"

# Step 5: Check networking
kubectl get svc -n <namespace>
kubectl get endpoints <service-name> -n <namespace>

# Step 6: Check configuration
kubectl get configmap,secret -n <namespace>
kubectl describe pod <pod-name> -n <namespace> | grep -A 20 "Environment"

# Step 7: Test connectivity
kubectl exec <pod-name> -n <namespace> -- curl http://localhost:<port>/health
```

## Quick Reference Commands

### Essential kubectl Commands

```bash
# Get resources
kubectl get <resource> -n <namespace> -o wide
kubectl get <resource> -n <namespace> -o yaml
kubectl get <resource> -n <namespace> -o json

# Describe resources
kubectl describe <resource> <name> -n <namespace>

# Watch resources
kubectl get pods -n <namespace> -w

# Delete resources
kubectl delete pod <pod-name> -n <namespace>
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force

# Apply changes
kubectl apply -f <manifest.yaml>
kubectl patch deployment <name> -n <namespace> -p '{"spec":{"replicas":3}}'

# Scale resources
kubectl scale deployment <name> -n <namespace> --replicas=3
```

### Useful One-Liners

```bash
# Get all pods with their node assignments
kubectl get pods -o wide --all-namespaces

# Get pods sorted by restart count
kubectl get pods --sort-by='.status.containerStatuses[0].restartCount' -n <namespace>

# Get all events sorted by time
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Get resource usage for all pods
kubectl top pods --all-namespaces --sort-by=memory

# Get all images used in cluster
kubectl get pods --all-namespaces -o jsonpath="{..image}" | tr -s '[[:space:]]' '\n' | sort | uniq

# Find pods using most CPU
kubectl top pods --all-namespaces --sort-by=cpu | head -20
```

## Common Production Scenarios

### Scenario 1: Application Not Responding

```bash
# 1. Check pod status
kubectl get pods -n <namespace>

# 2. Check if service has endpoints
kubectl get endpoints <service-name> -n <namespace>

# 3. Check pod logs
kubectl logs <pod-name> -n <namespace> --tail=100

# 4. Test from inside cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://<service-name>.<namespace>.svc.cluster.local

# 5. Check ingress/load balancer
kubectl get ingress -n <namespace>
```

### Scenario 2: High Memory Usage

```bash
# 1. Identify high memory pods
kubectl top pods --all-namespaces --sort-by=memory

# 2. Check memory limits
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Limits"

# 3. Check if OOMKilled
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'

# 4. Check node memory
kubectl top nodes
kubectl describe node <node-name> | grep -A 10 "Allocated resources"
```

### Scenario 3: Slow Application Performance

```bash
# 1. Check resource throttling
kubectl describe pod <pod-name> -n <namespace> | grep -i throttle

# 2. Check CPU usage
kubectl top pod <pod-name> -n <namespace>

# 3. Check node resources
kubectl top nodes

# 4. Check for pending pods
kubectl get pods -n <namespace> | grep Pending

# 5. Check HPA status
kubectl get hpa -n <namespace>
```

## Best Practices

::: tip Production Debugging Tips

1. **Always check events first** - They often contain the root cause
2. **Use `--previous` flag** - Get logs from crashed containers
3. **Describe before exec** - Understand the pod state first
4. **Check resource limits** - Many issues stem from resource constraints
5. **Verify labels and selectors** - Common networking issue
6. **Test connectivity** - Use debug pods to test network
7. **Monitor continuously** - Set up proper monitoring and alerting
8. **Document findings** - Keep a runbook for common issues
   :::

::: warning Production Considerations

- Be careful with `kubectl delete --force` - can cause data loss
- Avoid debugging directly in production - use staging when possible
- Set up proper logging and monitoring before issues occur
- Use read-only debugging tools when possible
- Document your debugging process for future reference
  :::

## Tools and Extensions

### Recommended Tools

```bash
# k9s - Terminal UI
# Install: https://k9scli.io/

# stern - Multi-pod log tailing
# Install: https://github.com/stern/stern

# kubectx/kubens - Context switching
# Install: https://github.com/ahmetb/kubectx

# dive - Image analysis
# Install: https://github.com/wagoodman/dive

# kubectl-debug - Debug plugin
# Install: https://github.com/aylei/kubectl-debug
```

### Useful kubectl Plugins

```bash
# Install krew (kubectl plugin manager)
# https://krew.sigs.k8s.io/

# Useful plugins:
kubectl krew install access-matrix
kubectl krew install resource-capacity
kubectl krew install node-shell
kubectl krew install pod-logs
```

## Conclusion

Debugging Kubernetes in production requires a systematic approach and deep understanding of the cluster components. This checklist provides a comprehensive guide to diagnose and resolve common issues.

Remember:

- Start with high-level overview (nodes, pods, events)
- Drill down systematically (pod → container → logs)
- Use the right tools for the job
- Document your findings
- Learn from each incident

::: details Additional Resources

- [Kubernetes Troubleshooting Guide](https://kubernetes.io/docs/tasks/debug/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes Debugging Guide](https://kubernetes.io/docs/tasks/debug-application-cluster/)
- [Production Best Practices](https://kubernetes.io/docs/setup/best-practices/)
  :::
