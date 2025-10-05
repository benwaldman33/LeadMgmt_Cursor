# Business Rules System - Complete Tutorial

## Table of Contents
1. [Introduction](#introduction)
2. [Understanding Business Rules](#understanding-business-rules)
3. [Rule Components](#rule-components)
4. [Creating Your First Rule](#creating-your-first-rule)
5. [Advanced Rule Patterns](#advanced-rule-patterns)
6. [Testing and Debugging](#testing-and-debugging)
7. [Best Practices](#best-practices)
8. [Common Use Cases](#common-use-cases)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

The BBDS Business Rules System provides powerful automated decision-making capabilities for lead management. Rules execute automatically during the lead lifecycle, allowing you to:

- **Automate lead assignment** to users or teams based on criteria
- **Adjust scores** dynamically based on lead attributes
- **Trigger notifications** when important conditions are met
- **Change lead status** automatically as they progress
- **Schedule enrichment** for high-value leads

### Key Features
- ✅ **Priority-based execution** - Control rule execution order
- ✅ **Flexible conditions** - Support for complex logic with AND/OR operators
- ✅ **Multiple action types** - Assignment, scoring, notifications, status changes, enrichment
- ✅ **Audit trail** - Complete execution logging for compliance
- ✅ **Live/Test modes** - Test rules before activating
- ✅ **Automatic integration** - Rules fire on lead creation, updates, and scoring

---

## Understanding Business Rules

### Rule Lifecycle

Business rules execute automatically at four key trigger points:

1. **`created`** - When a new lead is created
2. **`updated`** - When lead data is modified
3. **`scored`** - After AI scoring completes
4. **`enriched`** - After enrichment data is added

### Rule Execution Order

Rules execute in **priority order** (highest to lowest):
- Priority 90-100: High priority (critical assignments, urgent notifications)
- Priority 70-89: Medium-high priority
- Priority 50-69: Medium priority (default)
- Priority 30-49: Medium-low priority
- Priority 10-29: Low priority (logging, non-critical actions)

Multiple rules can execute for a single lead event. Each rule runs independently.

### Rule Types

The system supports five rule types:

| Type | Purpose | Common Uses |
|------|---------|-------------|
| **assignment** | Assign leads to users/teams | Territory routing, skill-based assignment |
| **scoring** | Adjust lead scores | Bonus points, penalty deductions |
| **notification** | Send alerts | High-value lead alerts, SLA warnings |
| **status_change** | Update lead status | Auto-qualify, move to nurture |
| **enrichment** | Trigger data enrichment | High-score leads, missing data |

---

## Rule Components

### 1. Basic Information

Every rule requires:

```yaml
Name: "High-Value Lead Assignment"
Description: "Assign leads with score > 80 to senior sales team"
Type: "assignment"
Priority: 70
Active: true
```

### 2. Conditions

Conditions define **when** a rule executes. Each condition has:

- **Field**: The data to evaluate (e.g., `score`, `industry`, `status`)
- **Operator**: How to compare (e.g., `equals`, `greater_than`, `contains`)
- **Value**: The comparison value
- **Logical Operator**: How to combine with next condition (`AND` or `OR`)

#### Available Fields

| Field | Type | Example Values |
|-------|------|----------------|
| `score` | Number | 0-100 |
| `status` | String | "new", "qualified", "contacted" |
| `industry` | String | "dental", "construction", "retail" |
| `companyName` | String | Any company name |
| `domain` | String | "example.com" |
| `assignedTo` | String | User ID |
| `assignedTeam` | String | Team ID |
| `campaignId` | String | Campaign ID |
| `confidence` | Number | 0.0-1.0 (from scoring) |
| `companySize` | String | "small", "medium", "large" |
| `revenue` | Number | Annual revenue |

#### Available Operators

| Operator | Description | Works With |
|----------|-------------|------------|
| `equals` | Exact match | All types |
| `not_equals` | Not equal | All types |
| `greater_than` | Numeric > | Numbers only |
| `less_than` | Numeric < | Numbers only |
| `contains` | Text substring | Strings only |
| `in` | Value in list | Arrays |
| `not_in` | Value not in list | Arrays |

#### Example Conditions

```javascript
// Single condition
{
  field: "score",
  operator: "greater_than",
  value: 80,
  logicalOperator: "AND"
}

// Multiple conditions with AND
[
  {
    field: "score",
    operator: "greater_than",
    value: 70,
    logicalOperator: "AND"
  },
  {
    field: "industry",
    operator: "equals",
    value: "dental",
    logicalOperator: "AND"
  }
]

// Multiple conditions with OR
[
  {
    field: "companySize",
    operator: "equals",
    value: "large",
    logicalOperator: "OR"
  },
  {
    field: "revenue",
    operator: "greater_than",
    value: 10000000,
    logicalOperator: "AND"
  }
]
```

### 3. Actions

Actions define **what happens** when conditions are met.

#### Assignment Actions

```javascript
// Assign to specific user
{
  type: "assignment",
  target: "user",
  value: "user-id-here"
}

// Assign to team
{
  type: "assignment",
  target: "team",
  value: "team-id-here"
}
```

#### Scoring Actions

```javascript
// Set exact score
{
  type: "scoring",
  target: "score",
  value: 95
}

// Note: For relative adjustments, use current score in conditions
```

#### Notification Actions

```javascript
{
  type: "notification",
  target: "email",
  value: "High-value lead detected!",
  metadata: {
    recipients: ["sales@company.com", "manager@company.com"],
    priority: "high"
  }
}
```

#### Status Change Actions

```javascript
{
  type: "status_change",
  target: "status",
  value: "qualified"
}

// Available statuses: "new", "contacted", "qualified", "converted", "lost"
```

#### Enrichment Actions

```javascript
{
  type: "enrichment",
  target: "full_enrichment",
  value: "priority",
  metadata: {
    sources: ["clearbit", "zoominfo"],
    priority: "high"
  }
}
```

---

## Creating Your First Rule

### Example 1: High-Value Lead Assignment

**Goal**: Automatically assign leads with scores above 80 to the senior sales team.

#### Step-by-Step:

1. **Navigate to Business Rules**
   - Click "Business Rules" in the main menu
   - Click "Create Rule" button

2. **Fill Basic Information**
   ```
   Name: High-Value Lead Auto-Assignment
   Description: Assigns high-scoring leads to senior team
   Type: assignment
   Priority: 70 (Medium-High)
   Active: ✓ Checked
   ```

3. **Add Condition**
   - Click "Add Condition"
   - Configure:
     ```
     Field: score
     Operator: greater_than
     Value: 80
     Logic: AND
     ```

4. **Add Action**
   - Click the "Assignment" action button
   - Configure:
     ```
     Target: team
     Value: [senior-sales-team-id]
     ```

5. **Save and Test**
   - Click "Create Rule"
   - Test with sample lead data

### Example 2: Industry-Specific Status Change

**Goal**: Automatically mark dental industry leads as "qualified" if they have a score over 60.

#### Configuration:

**Basic Info:**
```
Name: Auto-Qualify Dental Leads
Type: status_change
Priority: 50
Active: true
```

**Conditions:**
```javascript
[
  {
    field: "industry",
    operator: "equals",
    value: "dental",
    logicalOperator: "AND"
  },
  {
    field: "score",
    operator: "greater_than",
    value: 60,
    logicalOperator: "AND"
  }
]
```

**Actions:**
```javascript
[
  {
    type: "status_change",
    target: "status",
    value: "qualified"
  }
]
```

---

## Advanced Rule Patterns

### Pattern 1: Conditional Routing Based on Multiple Criteria

Route leads based on industry AND company size:

```javascript
// Conditions
[
  {
    field: "industry",
    operator: "in",
    value: ["dental", "construction", "manufacturing"],
    logicalOperator: "AND"
  },
  {
    field: "companySize",
    operator: "equals",
    value: "large",
    logicalOperator: "AND"
  },
  {
    field: "score",
    operator: "greater_than",
    value: 70,
    logicalOperator: "AND"
  }
]

// Actions
[
  {
    type: "assignment",
    target: "team",
    value: "enterprise-sales-team-id"
  },
  {
    type: "notification",
    target: "email",
    value: "New enterprise lead assigned",
    metadata: {
      recipients: ["enterprise-manager@company.com"]
    }
  }
]
```

### Pattern 2: Multi-Action Rules

Execute multiple actions when conditions match:

```javascript
// Rule: High-Priority Lead Processing
// Type: assignment
// Priority: 90

// Conditions
[
  {
    field: "score",
    operator: "greater_than",
    value: 85,
    logicalOperator: "AND"
  },
  {
    field: "status",
    operator: "equals",
    value: "new",
    logicalOperator: "AND"
  }
]

// Actions
[
  {
    type: "assignment",
    target: "user",
    value: "top-sales-rep-id"
  },
  {
    type: "status_change",
    target: "status",
    value: "contacted"
  },
  {
    type: "notification",
    target: "email",
    value: "HOT LEAD: Immediate attention required",
    metadata: {
      recipients: ["sales-manager@company.com"],
      priority: "urgent"
    }
  }
]
```

### Pattern 3: OR Logic for Multiple Industries

Apply rules across multiple industries:

```javascript
// Conditions with OR logic
[
  {
    field: "industry",
    operator: "equals",
    value: "dental",
    logicalOperator: "OR"
  },
  {
    field: "industry",
    operator: "equals",
    value: "medical",
    logicalOperator: "OR"
  },
  {
    field: "industry",
    operator: "equals",
    value: "healthcare",
    logicalOperator: "AND" // Switch back to AND for next condition
  },
  {
    field: "score",
    operator: "greater_than",
    value: 50,
    logicalOperator: "AND"
  }
]
```

### Pattern 4: Graduated Scoring Rules

Create multiple rules with different priority levels:

**Rule 1: Exceptional Leads (Priority 90)**
```javascript
// Condition: score > 90
// Action: Assign to VP of Sales
```

**Rule 2: High-Value Leads (Priority 70)**
```javascript
// Condition: score > 80 AND score <= 90
// Action: Assign to Senior Sales Team
```

**Rule 3: Standard Leads (Priority 50)**
```javascript
// Condition: score > 60 AND score <= 80
// Action: Assign to Regular Sales Team
```

---

## Testing and Debugging

### Test Rule Evaluation

Use the test endpoint to validate rules before activation:

```javascript
// In the UI, click "Test Rule" on any rule
// Provide sample lead data:
{
  "testData": {
    "score": 85,
    "industry": "dental",
    "status": "new",
    "companyName": "Test Dental Corp",
    "companySize": "large"
  }
}

// Response shows if rule matched and what actions would execute
```

### Viewing Rule Execution Logs

1. Navigate to a lead's detail page
2. Click "Activity Log" tab
3. View rule execution history:
   - Which rules executed
   - Success/failure status
   - Timestamp
   - Actions taken

### Common Issues and Solutions

#### Issue: Rule Not Executing

**Check:**
- ✓ Is the rule Active?
- ✓ Are conditions properly configured?
- ✓ Is the rule type appropriate for the trigger event?
- ✓ Check execution logs for errors

#### Issue: Wrong Action Executed

**Check:**
- ✓ Rule priority - higher priority rules execute first
- ✓ Condition logic (AND vs OR)
- ✓ Value types (string vs number)

#### Issue: Multiple Rules Conflict

**Solution:**
- Adjust priorities to control execution order
- Make conditions more specific
- Use status checks to prevent re-execution

---

## Best Practices

### 1. Rule Naming Conventions

Use descriptive names that indicate purpose:
- ✅ "High-Score Dental Leads → Senior Team"
- ✅ "New Leads → Auto-Qualify if Score > 70"
- ❌ "Rule 1"
- ❌ "Test"

### 2. Priority Guidelines

| Priority Range | Use Case |
|----------------|----------|
| 90-100 | Critical operations, executive escalations |
| 70-89 | Important assignments, urgent notifications |
| 50-69 | Standard operations, normal routing |
| 30-49 | Secondary actions, logging |
| 10-29 | Background tasks, non-critical updates |

### 3. Condition Design

- **Be Specific**: Narrow conditions prevent unintended executions
- **Use Status Guards**: Prevent rules from re-firing
- **Test Edge Cases**: Consider null values, empty strings
- **Document Complex Logic**: Add clear descriptions

### 4. Action Safety

- **Avoid Circular Logic**: Don't create rules that trigger each other
- **Use Appropriate Types**: Match rule type to primary action
- **Validate IDs**: Ensure user/team IDs are valid before using
- **Consider Notification Volume**: Don't spam with too many alerts

### 5. Performance Optimization

- Set rules to **inactive** when not needed
- Use higher priority for time-sensitive rules
- Limit number of actions per rule (3-5 max)
- Avoid overly complex condition chains

### 6. Maintenance

- **Review Monthly**: Check if rules are still relevant
- **Monitor Execution Logs**: Identify failing rules
- **Update as Business Changes**: Adjust priorities and conditions
- **Archive Old Rules**: Deactivate rather than delete for audit trail

---

## Common Use Cases

### Use Case 1: Territory-Based Assignment

```javascript
{
  name: "West Coast Territory Assignment",
  type: "assignment",
  priority: 60,
  conditions: [
    {
      field: "domain",
      operator: "contains",
      value: ".com",
      logicalOperator: "AND"
    }
    // In production, you'd use location data from enrichment
  ],
  actions: [
    {
      type: "assignment",
      target: "team",
      value: "west-coast-team-id"
    }
  ]
}
```

### Use Case 2: Lead Nurture Automation

```javascript
{
  name: "Move Low-Score Leads to Nurture",
  type: "status_change",
  priority: 40,
  conditions: [
    {
      field: "score",
      operator: "less_than",
      value: 40,
      logicalOperator: "AND"
    },
    {
      field: "status",
      operator: "equals",
      value: "new",
      logicalOperator: "AND"
    }
  ],
  actions: [
    {
      type: "status_change",
      target: "status",
      value: "nurture"
    }
  ]
}
```

### Use Case 3: VIP Customer Detection

```javascript
{
  name: "VIP Enterprise Lead Alert",
  type: "notification",
  priority: 95,
  conditions: [
    {
      field: "companySize",
      operator: "equals",
      value: "large",
      logicalOperator: "AND"
    },
    {
      field: "score",
      operator: "greater_than",
      value: 85,
      logicalOperator: "AND"
    },
    {
      field: "revenue",
      operator: "greater_than",
      value: 50000000,
      logicalOperator: "AND"
    }
  ],
  actions: [
    {
      type: "assignment",
      target: "user",
      value: "vp-sales-id"
    },
    {
      type: "notification",
      target: "email",
      value: "🚨 VIP Enterprise Lead Detected",
      metadata: {
        recipients: ["vp-sales@company.com", "ceo@company.com"],
        priority: "urgent"
      }
    },
    {
      type: "status_change",
      target: "status",
      value: "vip"
    }
  ]
}
```

### Use Case 4: Industry-Specific Qualification

```javascript
{
  name: "Dental Industry Auto-Qualification",
  type: "status_change",
  priority: 55,
  conditions: [
    {
      field: "industry",
      operator: "equals",
      value: "dental",
      logicalOperator: "AND"
    },
    {
      field: "score",
      operator: "greater_than",
      value: 65,
      logicalOperator: "AND"
    },
    {
      field: "confidence",
      operator: "greater_than",
      value: 0.7,
      logicalOperator: "AND"
    }
  ],
  actions: [
    {
      type: "status_change",
      target: "status",
      value: "qualified"
    },
    {
      type: "assignment",
      target: "team",
      value: "dental-specialists-team-id"
    }
  ]
}
```

### Use Case 5: Data Quality Enrichment

```javascript
{
  name: "Enrich High-Value Incomplete Leads",
  type: "enrichment",
  priority: 65,
  conditions: [
    {
      field: "score",
      operator: "greater_than",
      value: 75,
      logicalOperator: "AND"
    },
    {
      field: "companySize",
      operator: "equals",
      value: "",
      logicalOperator: "OR"
    },
    {
      field: "revenue",
      operator: "equals",
      value: null,
      logicalOperator: "AND"
    }
  ],
  actions: [
    {
      type: "enrichment",
      target: "company_data",
      value: "high_priority",
      metadata: {
        fields: ["companySize", "revenue", "employeeCount", "technologies"]
      }
    }
  ]
}
```

---

## Troubleshooting

### Error: "Rule not found"
- Verify the rule exists and wasn't deleted
- Check user permissions (SUPER_ADMIN or ANALYST required)

### Error: "Lead not found"
- Confirm lead ID is valid
- Check if lead was deleted

### Error: "Invalid action type"
- Ensure action type matches one of: `assignment`, `scoring`, `notification`, `status_change`, `enrichment`
- Check for typos in action configuration

### Error: "Condition evaluation failed"
- Verify field names match available fields
- Check that operators are appropriate for data types
- Ensure values are properly formatted

### Rule Executes But No Effect
- Check execution logs for success/failure
- Verify action target IDs are valid (user IDs, team IDs)
- Ensure lead is in correct status for action

### Rules Not Executing Automatically
- Verify rule is Active
- Check rule type matches trigger event
- Review priority - other rules may be modifying lead first
- Check application logs for integration errors

---

## API Integration

For advanced users, business rules can be managed via API:

### Create Rule
```bash
POST /api/business-rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Rule Name",
  "type": "assignment",
  "conditions": [...],
  "actions": [...],
  "priority": 50,
  "isActive": true
}
```

### List Rules
```bash
GET /api/business-rules?isActive=true&type=assignment
```

### Update Rule
```bash
PUT /api/business-rules/:id
```

### Test Rule
```bash
POST /api/business-rules/:id/test
{
  "testData": { ... }
}
```

### Execute Rules for Lead
```bash
POST /api/business-rules/evaluate/:leadId
{
  "context": { ... }
}
```

---

## Conclusion

The Business Rules System provides powerful automation capabilities that scale with your business. Start with simple rules and gradually add complexity as you understand your lead patterns.

### Next Steps
1. Create your first rule using Example 1
2. Test it with sample data
3. Activate and monitor execution logs
4. Iterate and refine based on results

### Additional Resources
- **User Manual**: See `BBDS_User_Manual.md` for general system overview
- **API Documentation**: Review API endpoints in service files
- **FAQ**: Check `HELP_FAQ.md` for common questions

### Support
For issues or questions about business rules:
1. Check execution logs first
2. Review this tutorial for solutions
3. Contact system administrator for advanced troubleshooting

---

**Document Version**: 1.0  
**Last Updated**: October 5, 2025  
**System Version**: LeadMgmt BBDS Platform

